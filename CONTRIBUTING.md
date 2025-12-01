# Contributing to Grapevine

Thank you for your interest in contributing to Grapevine! We welcome contributions from the community.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Issues

- Check existing issues before creating a new one
- Use clear, descriptive titles
- Include steps to reproduce bugs
- Provide relevant context (OS, Node version, etc.)

### Submitting Changes

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/PinataCloud/grapevine.git
   cd grapevine
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clear, concise commit messages
   - Follow existing code style
   - Update documentation as needed

4. **Push and open a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Development Guidelines

### Commit Messages

Follow conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks

### Code Style

- Use TypeScript for all new code
- Follow the existing code formatting (Prettier configured)
- Use meaningful variable and function names

## Project Structure

```
grapevine/
├── grapevine-api/       # API server
├── grapevine-frontend/  # Next.js frontend
```

### Setting Up Development Environment

**API Setup:**
```bash
# Install dependencies
pnpm install

# Setup database
createdb grapevine
cd grapevine-api
psql grapevine < schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start API server
pnpm run dev
```

**Frontend Setup:**
```bash
cd grapevine-frontend

# Configure environment
cp .env.example .env
# Edit .env with your API URL

# Start frontend
pnpm run dev
```

## Questions?

- Open an issue for questions
- Check existing documentation
- Join the Pinata discord

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
