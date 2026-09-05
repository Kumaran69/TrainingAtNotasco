"""
Custom exceptions for RailCart.

Each exception maps to a specific HTTP status code via the handlers
registered in main.py. Keeping them here mirrors the "Key Exception
Handling Concepts" from the original two exercises, unified into one
domain model:

    ProductNotFoundError -> like the original KeyError (unknown product)
    InvalidInputError     -> like the original ValueError (bad input)
    OutOfStockError       -> custom, insufficient product stock
    SeatNotFoundError     -> like the original IndexError (bad seat/ticket ref)
    BookingFullError      -> custom, seat type sold out
    TicketNotFoundError   -> unknown ticket id (cancel/view)
"""


class RailCartError(Exception):
    """Base class for all RailCart domain errors."""
    status_code = 400

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ProductNotFoundError(RailCartError):
    status_code = 404

    def __init__(self, product_id: str):
        super().__init__(f"Product '{product_id}' does not exist in the store.")


class InvalidInputError(RailCartError):
    status_code = 400


class OutOfStockError(RailCartError):
    status_code = 409

    def __init__(self, product_name: str, available: int):
        super().__init__(
            f"'{product_name}' is out of stock. Only {available} left."
        )


class SeatTypeNotFoundError(RailCartError):
    status_code = 404

    def __init__(self, seat_type: str):
        super().__init__(f"Seat type '{seat_type}' does not exist.")


class BookingFullError(RailCartError):
    status_code = 409

    def __init__(self, seat_type: str):
        super().__init__(f"Sorry, all '{seat_type}' seats are fully booked.")


class TicketNotFoundError(RailCartError):
    status_code = 404

    def __init__(self, ticket_id: str):
        super().__init__(f"No ticket found with ID '{ticket_id}'.")


class AuthenticationError(RailCartError):
    """Missing, invalid, or expired login credentials/token."""
    status_code = 401


class AuthorizationError(RailCartError):
    """Authenticated, but not allowed to act on this resource."""
    status_code = 403


class EmailAlreadyRegisteredError(RailCartError):
    status_code = 409

    def __init__(self, email: str):
        super().__init__(f"An account with email '{email}' already exists.")
