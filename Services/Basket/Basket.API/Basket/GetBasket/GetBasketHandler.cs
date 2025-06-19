namespace Basket.API.Basket.GetBasket;

public record GetBasketQuery(string UserName) : IQuery<GetBasketResult>;
public record GetBasketResult(ShoppingCart Cart);

public class GetBasketQueryHandler(IBasketRepository repository, ILogger<GetBasketQueryHandler> logger)
    : IQueryHandler<GetBasketQuery, GetBasketResult>
{
    public async Task<GetBasketResult> Handle(GetBasketQuery query, CancellationToken cancellationToken)
    {
        logger.LogInformation("🛒 Getting basket for user: {UserName}", query.UserName);
        
        var basket = await repository.GetBasket(query.UserName);
        
        // If basket doesn't exist, create an empty one
        if (basket == null || basket.Items == null || !basket.Items.Any())
        {
            logger.LogInformation("📦 Creating new empty basket for user: {UserName}", query.UserName);
            basket = new ShoppingCart
            {
                UserName = query.UserName,
                Items = new List<ShoppingCartItem>()
            };
            
            // Save the empty basket
            await repository.StoreBasket(basket);
            logger.LogInformation("✅ Empty basket created and saved for user: {UserName}", query.UserName);
        }
        else
        {
            logger.LogInformation("✅ Existing basket found for user: {UserName} with {ItemCount} items", 
                query.UserName, basket.Items.Count);
        }

        return new GetBasketResult(basket);
    }
}
