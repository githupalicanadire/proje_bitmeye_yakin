using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Add Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var authority = builder.Configuration["IdentityServerSettings:Authority"] ?? "http://localhost:6007";
        var secretKey = builder.Configuration["JwtSettings:SecretKey"] ?? "YourSuperSecretKeyThatIsAtLeast256BitsLong!ForToyLandApp2024";
        var audience = builder.Configuration["JwtSettings:Audience"] ?? "shopping-spa";
        
        // Debug logging to see what values are being read
        var logger = builder.Services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();
        logger.LogInformation("🔧 API Gateway JWT Configuration Debug:");
        logger.LogInformation("  Authority: {Authority}", authority);
        logger.LogInformation("  Audience: {Audience}", audience);
        logger.LogInformation("  SecretKey Length: {SecretKeyLength}", secretKey?.Length ?? 0);
        logger.LogInformation("  SecretKey Starts With: {SecretKeyStart}", secretKey?.Substring(0, Math.Min(20, secretKey.Length)) ?? "null");
        
        // Create the key exactly like the Identity API does
        var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
            System.Text.Encoding.UTF8.GetBytes(secretKey)
        );
        key.KeyId = "toyland-jwt-key-2024";
        
        options.Authority = authority;
        options.Audience = audience;
        options.RequireHttpsMetadata = bool.Parse(builder.Configuration["IdentityServerSettings:RequireHttpsMetadata"] ?? "false");

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false, // Temporarily disable for testing
            ValidateIssuer = false,   // Temporarily disable for testing
            ValidateLifetime = false, // Temporarily disable for testing
            ClockSkew = TimeSpan.FromMinutes(5),
            NameClaimType = "username",
            RoleClaimType = "role",
            IssuerSigningKey = key,
            ValidateIssuerSigningKey = false, // Temporarily disable for testing
            RequireSignedTokens = false, // Temporarily disable for testing
            ValidateTokenReplay = false
        };

        // Preserve original claim names
        options.MapInboundClaims = false;
        
        // Add event handlers for debugging
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogInformation("✅ API Gateway JWT Token validated successfully");
                logger.LogInformation("🔑 User: {Username}", context.Principal?.Identity?.Name);
                logger.LogInformation("🔑 Claims: {Claims}", 
                    string.Join(", ", context.Principal?.Claims.Select(c => $"{c.Type}={c.Value}") ?? Array.Empty<string>()));
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError("❌ API Gateway JWT Authentication failed: {Error}", context.Exception.Message);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddRateLimiter(rateLimiterOptions =>
{
    rateLimiterOptions.AddFixedWindowLimiter("fixed", options =>
    {
        options.Window = TimeSpan.FromSeconds(10);
        options.PermitLimit = 5;
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseCors("CorsPolicy");

// Debug middleware to log Authorization header and path
app.Use(async (context, next) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
    var path = context.Request.Path;
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    logger.LogInformation($"[DEBUG] Path: {path} | Authorization: {authHeader}");
    await next();
});

//app.UseAuthentication();
//app.UseAuthorization();

app.UseRateLimiter();

app.MapReverseProxy();

app.Run();
