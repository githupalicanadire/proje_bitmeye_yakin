using BuildingBlocks.Pagination;
using Ordering.Application.Orders.Queries.GetOrdersByName;

namespace Ordering.API.Endpoints;

//- Accepts a name parameter and pagination parameters.
//- Constructs a GetOrdersByNameQuery with these parameters.
//- Retrieves the data and returns it in a paginated format.

//public record GetOrdersByNameRequest(string Name);
public record GetOrdersByNameResponse(PaginatedResult<OrderDto> Orders);

public class GetOrdersByName : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/orders/name/{name}", async (string name, [AsParameters] PaginationRequest request, ISender sender) =>
        {
            var result = await sender.Send(new GetOrdersByNameQuery(name, request));

            var response = result.Adapt<GetOrdersByNameResponse>();

            return Results.Ok(response);
        })
        .RequireAuthorization("AuthenticatedUser")
        .WithName("GetOrdersByName")
        .Produces<GetOrdersByNameResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .WithSummary("Get Orders By Name")
        .WithDescription("Get Orders By Name");
    }
}
