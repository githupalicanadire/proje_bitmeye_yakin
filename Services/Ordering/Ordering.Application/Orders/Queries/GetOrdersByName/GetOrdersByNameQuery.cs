using BuildingBlocks.Pagination;

namespace Ordering.Application.Orders.Queries.GetOrdersByName;

public record GetOrdersByNameQuery(string Name, PaginationRequest PaginationRequest)
    : IQuery<GetOrdersByNameResult>;

public record GetOrdersByNameResult(PaginatedResult<OrderDto> Orders);