using Discount.Grpc;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Caching.Distributed;
using BuildingBlocks.Messaging.MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

//Application Services
var assembly = typeof(Program).Assembly;
builder.Services.AddCarter();

builder.Services.AddMediatR(config =>
{
    config.RegisterServicesFromAssembly(assembly);
    config.AddOpenBehavior(typeof(ValidationBehavior<,>));
    config.AddOpenBehavior(typeof(LoggingBehavior<,>));
});

//Data Services
builder.Services.AddMarten(opts =>
{
    opts.Connection(builder.Configuration.GetConnectionString("Database")!);
    opts.Schema.For<ShoppingCart>().Identity(x => x.UserName);
}).UseLightweightSessions();

builder.Services.AddScoped<IBasketRepository, BasketRepository>();
builder.Services.Decorate<IBasketRepository, CachedBasketRepository>();

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    //options.InstanceName = "Basket";
});

//Grpc Services
builder.Services.AddGrpcClient<DiscountProtoService.DiscountProtoServiceClient>(options =>
{
    options.Address = new Uri(builder.Configuration["GrpcSettings:DiscountUrl"]!);
})
.ConfigurePrimaryHttpMessageHandler(() =>
{
    var handler = new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback =
        HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
    };

    return handler;
});

//Async Communication Services
builder.Services.AddMessageBroker(builder.Configuration);

//Authentication & Authorization
// Clear default claim mappings to preserve original JWT claims
Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        // Use configuration-based authority to support both development and Docker environments
        var authority = builder.Configuration["IdentityServerSettings:Authority"] ?? "http://localhost:6007";
        var secretKey = builder.Configuration["JwtSettings:SecretKey"] ?? "YourSuperSecretKeyThatIsAtLeast256BitsLong!ForToyLandApp2024";
        var audience = builder.Configuration["JwtSettings:Audience"] ?? "shopping-spa";
        
        // Debug logging to see what values are being read
        var logger = builder.Services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();
        logger.LogInformation("🔧 JWT Configuration Debug:");
        logger.LogInformation("  Authority: {Authority}", authority);
        logger.LogInformation("  Audience: {Audience}", audience);
        logger.LogInformation("  SecretKey Length: {SecretKeyLength}", secretKey?.Length ?? 0);
        logger.LogInformation("  SecretKey Starts With: {SecretKeyStart}", secretKey?.Substring(0, Math.Min(20, secretKey.Length)) ?? "null");
        logger.LogInformation("  SecretKey Full: {SecretKeyFull}", secretKey);
        
        // Create the key exactly like the Identity API does
        var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
            System.Text.Encoding.UTF8.GetBytes(secretKey)
        );
        key.KeyId = "toyland-jwt-key-2024";
        
        logger.LogInformation("  KeyId: {KeyId}", key.KeyId);
        logger.LogInformation("  Key Length: {KeyLength}", key.Key.Length);
        
        options.Authority = authority;
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateAudience = true,
            ValidAudiences = new[] { "basket-api", "shopping-spa", "catalog-api", "ordering-api", "gateway-api" },
            ValidateIssuer = true,
            ValidIssuer = authority,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5),
            NameClaimType = "username", // Map username claim directly
            RoleClaimType = "role", // Map role claim
            IssuerSigningKey = key,
            ValidateIssuerSigningKey = true,
            // Add these to help with debugging
            RequireSignedTokens = true,
            ValidateTokenReplay = false
        };

        // Enable PII logging for detailed error messages
        Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = true;
        
        logger.LogInformation("  TokenValidationParameters:");
        logger.LogInformation("    ValidateAudience: {ValidateAudience}", options.TokenValidationParameters.ValidateAudience);
        logger.LogInformation("    ValidAudience: {ValidAudience}", options.TokenValidationParameters.ValidAudience);
        logger.LogInformation("    ValidateIssuer: {ValidateIssuer}", options.TokenValidationParameters.ValidateIssuer);
        logger.LogInformation("    ValidIssuer: {ValidIssuer}", options.TokenValidationParameters.ValidIssuer);
        logger.LogInformation("    ValidateLifetime: {ValidateLifetime}", options.TokenValidationParameters.ValidateLifetime);
        logger.LogInformation("    ClockSkew: {ClockSkew}", options.TokenValidationParameters.ClockSkew);
        logger.LogInformation("    NameClaimType: {NameClaimType}", options.TokenValidationParameters.NameClaimType);
        logger.LogInformation("    RoleClaimType: {RoleClaimType}", options.TokenValidationParameters.RoleClaimType);
        logger.LogInformation("    ValidateIssuerSigningKey: {ValidateIssuerSigningKey}", options.TokenValidationParameters.ValidateIssuerSigningKey);
        logger.LogInformation("    RequireSignedTokens: {RequireSignedTokens}", options.TokenValidationParameters.RequireSignedTokens);

        // Preserve original claim names
        options.MapInboundClaims = false;
        
        // Add event handlers for debugging
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogInformation("✅ JWT Token validated successfully");
                logger.LogInformation("🔑 User: {Username}", context.Principal?.Identity?.Name);
                logger.LogInformation("🔑 Claims: {Claims}", 
                    string.Join(", ", context.Principal?.Claims.Select(c => $"{c.Type}={c.Value}") ?? Array.Empty<string>()));
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError("❌ JWT Authentication failed: {Error}", context.Exception.Message);
                logger.LogError("❌ Exception Type: {ExceptionType}", context.Exception.GetType().Name);
                logger.LogError("❌ Stack Trace: {StackTrace}", context.Exception.StackTrace);
                
                // Log the token details if available
                if (context.Request.Headers.ContainsKey("Authorization"))
                {
                    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                    {
                        var token = authHeader.Substring("Bearer ".Length);
                        logger.LogError("❌ Token Header: {TokenHeader}", token.Substring(0, Math.Min(50, token.Length)) + "...");
                        
                        try
                        {
                            var handler = new Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler();
                            var jsonToken = handler.ReadJsonWebToken(token);
                            logger.LogError("❌ Token Issuer: {TokenIssuer}", jsonToken.Issuer);
                            logger.LogError("❌ Token Audience: {TokenAudience}", jsonToken.Audiences?.FirstOrDefault());
                            logger.LogError("❌ Token KeyId: {TokenKeyId}", jsonToken.Kid);
                            logger.LogError("❌ Token Algorithm: {TokenAlgorithm}", jsonToken.Alg);
                        }
                        catch (Exception ex)
                        {
                            logger.LogError("❌ Failed to parse token: {ParseError}", ex.Message);
                        }
                    }
                }
                
                return Task.CompletedTask;
            },
            OnMessageReceived = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogInformation("📨 JWT Message received");
                logger.LogInformation("📨 Path: {Path}", context.Request.Path);
                logger.LogInformation("📨 Method: {Method}", context.Request.Method);
                logger.LogInformation("📨 Authorization Header: {AuthHeader}", 
                    context.Request.Headers["Authorization"].FirstOrDefault() ?? "NOT FOUND");
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogWarning("⚠️ JWT Challenge issued");
                logger.LogWarning("⚠️ Error: {Error}", context.Error);
                logger.LogWarning("⚠️ ErrorDescription: {ErrorDescription}", context.ErrorDescription);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AuthenticatedUser", policy =>
        policy.RequireAuthenticatedUser());
});

//CORS for React app
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowShoppingApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:6006")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

//Cross-Cutting Services
builder.Services.AddExceptionHandler<CustomExceptionHandler>();

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Database")!)
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!);

var app = builder.Build();

// Debug middleware to log Authorization header and path
app.Use(async (context, next) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
    var path = context.Request.Path;
    var method = context.Request.Method;
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    
    logger.LogInformation($"[DEBUG] Request Details:");
    logger.LogInformation($"[DEBUG]   Path: {path}");
    logger.LogInformation($"[DEBUG]   Method: {method}");
    logger.LogInformation($"[DEBUG]   Authorization: {authHeader}");
    
    // Log all headers for debugging
    logger.LogInformation($"[DEBUG]   All Headers:");
    foreach (var header in context.Request.Headers)
    {
        logger.LogInformation($"[DEBUG]     {header.Key}: {header.Value}");
    }
    
    await next();
});

// Initialize database in development (no seed data for baskets - users create their own)
if (app.Environment.IsDevelopment())
{
    await InitializeDatabaseAsync(app);
}

async Task InitializeDatabaseAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    // Retry logic for database connection
    var maxRetries = 30;
    var retryDelay = TimeSpan.FromSeconds(2);

    for (int retry = 0; retry < maxRetries; retry++)
    {
        try
        {
            logger.LogInformation("🔄 Attempting to connect to PostgreSQL (attempt {Retry}/{MaxRetries})", retry + 1, maxRetries);

            // Test Marten connection
            var documentStore = scope.ServiceProvider.GetRequiredService<IDocumentStore>();
            using var session = documentStore.LightweightSession();

            // Ensure database exists and is migrated
            await documentStore.Storage.ApplyAllConfiguredChangesToDatabaseAsync();

            // Test Redis connection
            logger.LogInformation("🔄 Testing Redis connection...");
            var distributedCache = scope.ServiceProvider.GetRequiredService<IDistributedCache>();
            await distributedCache.SetStringAsync("test-key", "test-value");
            var testValue = await distributedCache.GetStringAsync("test-key");
            await distributedCache.RemoveAsync("test-key");

            if (testValue == "test-value")
            {
                logger.LogInformation("✅ Redis connection successful");
            }
            else
            {
                logger.LogWarning("⚠️ Redis connection issue - cache may not work properly");
            }

            logger.LogInformation("✅ Basket service initialization completed successfully");
            logger.LogInformation("ℹ️ Baskets use Redis for caching and PostgreSQL for persistence");
            logger.LogInformation("ℹ️ Users will create their own shopping carts - no pre-seeded baskets");
            return;
        }
        catch (Exception ex)
        {
            logger.LogWarning("⚠️ Database connection failed (attempt {Retry}/{MaxRetries}): {Error}",
                retry + 1, maxRetries, ex.Message);

            if (retry == maxRetries - 1)
            {
                logger.LogError("❌ Failed to connect to PostgreSQL after {MaxRetries} attempts", maxRetries);
                throw;
            }

            await Task.Delay(retryDelay);
        }
    }
}

// Configure the HTTP request pipeline.
app.UseCors("AllowShoppingApp");
app.UseAuthentication();
app.UseAuthorization();

// Add test endpoint to verify routing works
app.MapGet("/test", () => "Basket API is working!");

// Add debug endpoint to inspect headers
app.MapGet("/debug-headers", (HttpRequest request) =>
{
    var headers = request.Headers.Select(h => $"{h.Key}: {h.Value}").ToList();
    return Results.Ok(headers);
});

// Log registered endpoints
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("🔧 Registering Carter endpoints...");

app.MapCarter();

// Log all registered endpoints
var endpoints = app.Urls.SelectMany(url => 
    app.Services.GetRequiredService<IEnumerable<EndpointDataSource>>()
        .SelectMany(eds => eds.Endpoints)
        .OfType<RouteEndpoint>()
        .Select(ep => new { Url = url, Path = ep.RoutePattern.RawText }))
    .ToList();

logger.LogInformation("📋 Registered endpoints:");
foreach (var endpoint in endpoints)
{
    logger.LogInformation("  - {Url}{Path}", endpoint.Url, endpoint.Path);
}

app.UseExceptionHandler(options => { });
app.UseHealthChecks("/health",
    new HealthCheckOptions
    {
        ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
    });

app.Run();
