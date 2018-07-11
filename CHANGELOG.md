# 2.1.0

- Allow for auth header

# 2.0.1

- Fixed url to unexisting swapi endpoint (docs)

# 2.0.0

- Drop support for node 0.10 and 0.12
- Add support for UNION, INTERFACE, INPUT_OBJECT and ENUM types
- Show mutation/subscription rooted at virtual "Schema" type.
- Add ability to use graphql schema language files as input
- Introduce `--theme` option for freely customizing appearance
- Depreacte `--sort` and `--noargs` arguments in lieu of `--theme`

# 1.4.0

- Include '!' for required (`NON_NULL`) args and fields
- Fixed #7
- Allow specifying local schema as argument

# 1.3.0

- Allow sorting fields with `--sort` flag

# 1.1.0

- Include field arguments in output by default
- Introduce `--noargs` flat to suppress field arguments printing

# 1.0.1

- Use introspection query straight from graphql package

# 1.0.0

- Initial release
