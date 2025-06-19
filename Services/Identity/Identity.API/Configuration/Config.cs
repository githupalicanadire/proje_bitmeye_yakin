using Duende.IdentityServer.Models;
using Duende.IdentityServer;

namespace Identity.API.Configuration;

public static class Config
{
    public static IEnumerable<IdentityResource> IdentityResources =>
        new IdentityResource[]
        {
            new IdentityResources.OpenId(),
            new IdentityResources.Profile(),
            new IdentityResources.Email(),
            new IdentityResource("roles", "User roles", new[] { "role" })
        };

    public static IEnumerable<ApiScope> ApiScopes =>
        new ApiScope[]
        {
            // Microservices API Scopes
            new ApiScope("catalog", "Catalog Service"),
            new ApiScope("basket", "Basket Service"),
            new ApiScope("ordering", "Ordering Service"),
            new ApiScope("gateway", "API Gateway"),
            new ApiScope("shopping_api", "Shopping API"),

            // Full access scope
            new ApiScope("shopping", "Shopping Application Full Access")
        };

    public static IEnumerable<ApiResource> ApiResources =>
        new ApiResource[]
        {
            new ApiResource("catalog-api", "Catalog API")
            {
                Scopes = { "catalog", "shopping", "shopping_api" }
            },
            new ApiResource("basket-api", "Basket API")
            {
                Scopes = { "basket", "shopping", "shopping_api" }
            },
            new ApiResource("ordering-api", "Ordering API")
            {
                Scopes = { "ordering", "shopping", "shopping_api" }
            },
            new ApiResource("gateway-api", "Gateway API")
            {
                Scopes = { "gateway", "shopping", "shopping_api", "catalog", "basket", "ordering" }
            }
        };

    public static IEnumerable<Client> Clients =>
        new Client[]
        {


























            // React SPA Client (Shopping Application) - Resource Owner Password Flow
            new Client
            {
                ClientId = "shopping-spa",
                ClientName = "ToyLand Shopping Application",

                // Support Resource Owner Password flow for direct login
                AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,

                RequirePkce = false,
                RequireClientSecret = false,
                RequireConsent = false,
                AllowOfflineAccess = true,

                // Redirect URIs for development
                RedirectUris = {
                    "http://localhost:6006/callback",
                    "http://localhost:3000/callback"
                },
                PostLogoutRedirectUris = {
                    "http://localhost:6006/",
                    "http://localhost:3000/"
                },
                AllowedCorsOrigins = {
                    "http://localhost:6006",
                    "http://localhost:3000"
                },

                AllowedScopes = {
                    IdentityServerConstants.StandardScopes.OpenId,
                    IdentityServerConstants.StandardScopes.Profile,
                    IdentityServerConstants.StandardScopes.Email,
                    "roles",
                    "shopping",
                    "shopping_api",
                    "catalog",
                    "basket",
                    "ordering"
                },

                AllowAccessTokensViaBrowser = true,
                AccessTokenLifetime = 3600, // 1 hour
                IdentityTokenLifetime = 3600, // 1 hour
                RefreshTokenUsage = TokenUsage.ReUse,
                RefreshTokenExpiration = TokenExpiration.Sliding,
                SlidingRefreshTokenLifetime = 3600 * 24 * 7, // 7 days
            },

            // API Gateway Client (Machine to Machine)
            new Client
            {
                ClientId = "gateway-client",
                ClientName = "API Gateway",
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                ClientSecrets = { new Secret("default-gateway-secret-dev-only".Sha256()) },
                AllowedScopes = { "gateway", "catalog", "basket", "ordering" }
            },

            // Service to Service Clients
            new Client
            {
                ClientId = "microservices-client",
                ClientName = "Microservices Internal Client",
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                ClientSecrets = { new Secret("default-microservices-secret-dev-only".Sha256()) },
                AllowedScopes = { "catalog", "basket", "ordering", "shopping_api" }
            }
        };
}
