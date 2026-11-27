# @rent/shell

The app shell that both applications, `rent` and `admin`, share (ADR 0028): the error handler and
`ClientErrors`, focus on navigation (`PageFocus`), the title strategy, and the session over the
backend. It depends on `@rent/api` and `@rent/domain`; it never imports an application.
