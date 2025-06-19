using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Identity.API.Data;
using Identity.API.Models;
using Serilog;
using Serilog.Events;
using Duende.IdentityServer.EntityFramework.DbContexts;
using Duende.IdentityServer.EntityFramework.Mappers;
using Duende.IdentityServer.EntityFramework.Options;
using Duende.IdentityServer.EntityFramework.Storage;
using Duende.IdentityServer.EntityFramework.Stores;
using Duende.IdentityServer.Services;
using Duende.IdentityServer.Stores;
using Duende.IdentityServer.Validation;
using Duende.IdentityServer;
using Identity.API.Configuration;
// Removed unused JWT imports - IdentityServer handles token generation
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using HealthChecks.UI.Client;
using Microsoft.OpenApi.Models;
using Identity.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

var migrationsAssembly = typeof(Program).Assembly.GetName().Name;

// Configure IdentityServer
builder.Services.AddIdentityServer(options =>
{
    // Event configuration
    options.Events.RaiseErrorEvents = true;
    options.Events.RaiseInformationEvents = true;
    options.Events.RaiseFailureEvents = true;
    options.Events.RaiseSuccessEvents = true;

    // Issuer configuration
    options.EmitStaticAudienceClaim = true;
    options.IssuerUri = "http://localhost:6007";

    // User interaction configuration
    options.UserInteraction.LoginUrl = "/Account/Login";
    options.UserInteraction.LogoutUrl = "/Account/Logout";
    options.UserInteraction.ErrorUrl = "/Home/Error";

    // Authentication configuration
    options.Authentication.CookieLifetime = TimeSpan.FromHours(2);
    options.Authentication.CookieSlidingExpiration = true;

    // Caching configuration
    options.Caching.ClientStoreExpiration = TimeSpan.FromMinutes(5);
    options.Caching.ResourceStoreExpiration = TimeSpan.FromMinutes(5);

    // Key management for production readiness
    if (builder.Environment.IsDevelopment())
    {
        options.KeyManagement.Enabled = false; // Use developer signing credential
    }
    else
    {
        options.KeyManagement.Enabled = true;
        options.KeyManagement.KeyPath = "/app/keys";
    }
})
.AddConfigurationStore(options =>
{
    options.ConfigureDbContext = b => b.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.MigrationsAssembly(typeof(Program).Assembly.GetName().Name));
})
.AddOperationalStore(options =>
{
    options.ConfigureDbContext = b => b.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.MigrationsAssembly(typeof(Program).Assembly.GetName().Name));

    // Cleanup configuration
    options.EnableTokenCleanup = true;
    options.TokenCleanupInterval = 3600; // 1 hour
})
.AddAspNetIdentity<ApplicationUser>()
.AddProfileService<CustomProfileService>()
.AddDeveloperSigningCredential();

// Add JWT Authentication for API endpoints
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Authority = "http://localhost:6007";
    options.RequireHttpsMetadata = false;
    options.Audience = "shopping-spa";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = "http://localhost:6007",
        ValidAudience = "shopping-spa",
        NameClaimType = "preferred_username",
        RoleClaimType = "role"
    };
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentCors", policy => policy
        .WithOrigins(
            "http://localhost:6006",
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:4200"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());

    options.AddPolicy("ProductionCors", policy => policy
        .WithOrigins() // Add production origins here
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
});

// Add Controllers
builder.Services.AddControllers();

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!);

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "Identity API", Version = "v1" });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Configure CORS based on environment
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevelopmentCors");
}
else
{
    app.UseCors("ProductionCors");
}

app.UseStaticFiles();
app.UseRouting();

app.UseIdentityServer();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

// Initialize Database and Seed Data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    try
    {
        Log.Information("🚀 Initializing Identity Server database...");

        // Apply migrations
        var context = services.GetRequiredService<ApplicationDbContext>();
        var configContext = services.GetRequiredService<ConfigurationDbContext>();

        await context.Database.MigrateAsync();
        await configContext.Database.MigrateAsync();

        // Seed data using the SeedData class
        await SeedData.EnsureSeedData(services);

        Log.Information("✅ Identity Server initialization completed successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "❌ An error occurred while initializing the Identity Server database");
        throw;
    }
}

Log.Information("🔐 Identity Server starting up...");
app.Run();
