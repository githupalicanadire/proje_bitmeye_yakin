using Identity.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace Identity.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AccountController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ILogger<AccountController> _logger;
    private readonly IConfiguration _configuration;

    public AccountController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ILogger<AccountController> logger,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _logger = logger;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _userManager.FindByNameAsync(request.Username);
        if (user == null)
        {
            return BadRequest(new { message = "Invalid username or password" });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Invalid username or password" });
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        // Get user roles
        var roles = await _userManager.GetRolesAsync(user);

        // Generate JWT token with proper claims
        var token = GenerateJwtToken(user, roles);

        _logger.LogInformation("User {Username} logged in successfully", request.Username);

        return Ok(new
        {
            success = true,
            message = "Login successful",
            token = token,
            user = new
            {
                id = user.Id,
                username = user.UserName,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                fullName = user.FullName,
                roles = roles
            }
        });
    }

    private string GenerateJwtToken(ApplicationUser user, IList<string> roles)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"] ?? "YourSuperSecretKeyThatIsAtLeast256BitsLong!ForToyLandApp2024";
        
        // Debug logging to see what secret key is being used
        _logger.LogInformation("🔧 Identity API JWT Configuration Debug:");
        _logger.LogInformation("  SecretKey Length: {SecretKeyLength}", secretKey?.Length ?? 0);
        _logger.LogInformation("  SecretKey Starts With: {SecretKeyStart}", secretKey?.Substring(0, Math.Min(20, secretKey.Length)) ?? "null");
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        
        // Add KeyId to fix the kid missing issue
        key.KeyId = "toyland-jwt-key-2024";
        
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new(JwtRegisteredClaimNames.Name, user.FullName),
            new("username", user.UserName ?? ""),
            new("preferred_username", user.UserName ?? ""),
            new("user_id", user.Id)
        };

        // Add role claims
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var issuer = jwtSettings["Issuer"] ?? "http://localhost:6007";
        var audience = jwtSettings["Audience"] ?? "shopping-spa";
        var expirationMinutes = jwtSettings["ExpirationMinutes"] ?? "60";
        
        _logger.LogInformation("  Issuer: {Issuer}", issuer);
        _logger.LogInformation("  Audience: {Audience}", audience);
        _logger.LogInformation("  ExpirationMinutes: {ExpirationMinutes}", expirationMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(expirationMinutes)),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        _logger.LogInformation("User logged out");
        return Ok(new { message = "Logout successful" });
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        _logger.LogInformation("Getting profile for user. Claims: {Claims}",
            string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));

        var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("No sub claim found in token");
            return BadRequest(new { message = "User ID not found" });
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new
        {
            id = user.Id,
            username = user.UserName,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            fullName = user.FullName,
            roles = roles,
            lastLoginAt = user.LastLoginAt
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existingUser = await _userManager.FindByNameAsync(request.Username);
        if (existingUser != null)
        {
            return BadRequest(new { message = "Username already exists" });
        }

        existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return BadRequest(new { message = "Email already exists" });
        }

        var user = new ApplicationUser
        {
            UserName = request.Username,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Failed to create user", errors = result.Errors });
        }

        // Add default role
        await _userManager.AddToRoleAsync(user, "customer");

        _logger.LogInformation("User {Username} registered successfully", request.Username);

        return Ok(new
        {
            success = true,
            message = "Registration successful",
            user = new
            {
                id = user.Id,
                username = user.UserName,
                email = user.Email,
                fullName = user.FullName
            }
        });
    }

    [HttpGet("test-jwt")]
    public IActionResult TestJwt()
    {
        var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
        return Ok(new
        {
            message = "JWT is working",
            claims = claims,
            isAuthenticated = User.Identity?.IsAuthenticated ?? false,
            name = User.Identity?.Name
        });
    }

    [HttpGet("debug/clients")]
    public async Task<IActionResult> DebugClients()
    {
        try
        {
            var configDbContext = HttpContext.RequestServices.GetRequiredService<Duende.IdentityServer.EntityFramework.DbContexts.ConfigurationDbContext>();

            var clients = await configDbContext.Clients
                .Select(c => new { c.Id, c.ClientId, c.ClientName, c.Enabled })
                .ToListAsync();

            var corsOrigins = await configDbContext.Set<Duende.IdentityServer.EntityFramework.Entities.ClientCorsOrigin>()
                .Select(co => new { co.ClientId, co.Origin })
                .ToListAsync();

            return Ok(new {
                message = "Database client status",
                clientCount = clients.Count,
                clients = clients,
                corsOrigins = corsOrigins,
                hasDemoClient = clients.Any(c => c.ClientId == "demo-client")
            });
        }
        catch (Exception ex)
        {
            return Ok(new { error = ex.Message });
        }
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
