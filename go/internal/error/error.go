package error

import "errors"

type Error struct {
	Err  error
	Code int
}

func (e *Error) Error() string {
	return e.Err.Error()
}

func (e *Error) Unwrap() error {
	return e.Err
}

func NewError(err error, code int) *Error {
	// To avoid wrapping an error multiple times
	var customErr *Error
	if errors.As(err, &customErr) {
		return customErr
	}

	return &Error{
		Err:  err,
		Code: code,
	}
}

func NewBadRequestError(err error) *Error {
	return NewError(err, 400)
}

func NewUnauthorizedError(err error) *Error {
	return NewError(err, 401)
}

func NewForbiddenError(err error) *Error {
	return NewError(err, 403)
}

func NewNotFoundError(err error) *Error {
	return NewError(err, 404)
}

func NewConflictError(err error) *Error {
	return NewError(err, 409)
}

func NewValidationError(err error) *Error {
	return NewError(err, 422)
}

func NewInternalServerError(err error) *Error {
	return NewError(err, 500)
}

func NewNotImplementedError(err error) *Error {
	return NewError(err, 501)
}

func NewServiceUnavailableError(err error) *Error {
	return NewError(err, 503)
}
