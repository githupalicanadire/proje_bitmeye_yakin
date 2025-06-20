namespace Ordering.Application.Orders.Commands.CreateOrder;
public class CreateOrderHandler(IApplicationDbContext dbContext)
    : ICommandHandler<CreateOrderCommand, CreateOrderResult>
{
    public async Task<CreateOrderResult> Handle(CreateOrderCommand command, CancellationToken cancellationToken)
    {
        // Ensure customer exists, create if not
        var customerId = CustomerId.Of(command.Order.CustomerId);
        var customer = await dbContext.Customers.FindAsync([customerId], cancellationToken);
        
        if (customer == null)
        {
            // Create customer from order data
            customer = Customer.Create(
                customerId,
                $"{command.Order.ShippingAddress.FirstName} {command.Order.ShippingAddress.LastName}",
                command.Order.ShippingAddress.EmailAddress
            );
            dbContext.Customers.Add(customer);
        }

        // Ensure products exist, create if not
        foreach (var orderItemDto in command.Order.OrderItems)
        {
            var productId = ProductId.Of(orderItemDto.ProductId);
            var product = await dbContext.Products.FindAsync([productId], cancellationToken);
            
            if (product == null)
            {
                // Create product with default name and price from order item
                product = Product.Create(
                    productId,
                    $"Product {orderItemDto.ProductId}", // Default name
                    orderItemDto.Price
                );
                dbContext.Products.Add(product);
            }
        }

        //create Order entity from command object
        var order = CreateNewOrder(command.Order);

        dbContext.Orders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new CreateOrderResult(order.Id.Value);
    }

    private Order CreateNewOrder(OrderDto orderDto)
    {
        var shippingAddress = Address.Of(orderDto.ShippingAddress.FirstName, orderDto.ShippingAddress.LastName, orderDto.ShippingAddress.EmailAddress, orderDto.ShippingAddress.AddressLine, orderDto.ShippingAddress.Country, orderDto.ShippingAddress.State, orderDto.ShippingAddress.ZipCode);
        var billingAddress = Address.Of(orderDto.BillingAddress.FirstName, orderDto.BillingAddress.LastName, orderDto.BillingAddress.EmailAddress, orderDto.BillingAddress.AddressLine, orderDto.BillingAddress.Country, orderDto.BillingAddress.State, orderDto.BillingAddress.ZipCode);

        var newOrder = Order.Create(
                id: OrderId.Of(Guid.NewGuid()),
                customerId: CustomerId.Of(orderDto.CustomerId),
                orderName: OrderName.Of(orderDto.OrderName),
                shippingAddress: shippingAddress,
                billingAddress: billingAddress,
                payment: Payment.Of(orderDto.Payment.CardName, orderDto.Payment.CardNumber, orderDto.Payment.Expiration, orderDto.Payment.Cvv, orderDto.Payment.PaymentMethod)
                );

        foreach (var orderItemDto in orderDto.OrderItems)
        {
            newOrder.Add(ProductId.Of(orderItemDto.ProductId), orderItemDto.Quantity, orderItemDto.Price);
        }
        return newOrder;
    }
}
