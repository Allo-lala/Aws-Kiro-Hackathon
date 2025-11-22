#!/bin/bash
# Deployment Script
# This script helps deploy the application in different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "$1"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_error ".env file not found!"
        print_info "Please copy .env.example to .env and configure it:"
        print_info "  cp .env.example .env"
        exit 1
    fi
    print_success ".env file found"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        print_info "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_success "Docker is installed"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed!"
        print_info "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    print_success "Docker Compose is installed"
}

# Development deployment
deploy_dev() {
    print_info "\n📦 Starting development deployment...\n"
    
    check_env_file
    check_docker
    check_docker_compose
    
    print_info "Building and starting services..."
    docker-compose up -d --build
    
    print_info "\nWaiting for services to be healthy..."
    sleep 10
    
    # Check health
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend health check failed"
    fi
    
    print_success "\n✨ Development deployment complete!"
    print_info "\nServices:"
    print_info "  Frontend: http://localhost:8080"
    print_info "  Backend:  http://localhost:3000"
    print_info "  Database: localhost:5432"
    print_info "\nView logs:"
    print_info "  docker-compose logs -f"
}

# Production deployment
deploy_prod() {
    print_info "\n🚀 Starting production deployment...\n"
    
    check_env_file
    check_docker
    check_docker_compose
    
    # Verify critical environment variables
    source .env
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-very-secure-secret-key-change-this-in-production" ]; then
        print_error "JWT_SECRET is not set or using default value!"
        print_info "Please set a secure JWT_SECRET in .env"
        exit 1
    fi
    
    if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "your-secure-password-here" ]; then
        print_error "DB_PASSWORD is not set or using default value!"
        print_info "Please set a secure DB_PASSWORD in .env"
        exit 1
    fi
    
    print_success "Environment variables validated"
    
    print_info "Building production images..."
    docker-compose -f docker-compose.prod.yml build
    
    print_info "Starting production services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    print_info "\nWaiting for services to be healthy..."
    sleep 15
    
    # Check health
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
        print_info "Check logs: docker-compose -f docker-compose.prod.yml logs backend"
        exit 1
    fi
    
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        print_info "Check logs: docker-compose -f docker-compose.prod.yml logs frontend"
        exit 1
    fi
    
    print_success "\n✨ Production deployment complete!"
    print_info "\nServices are running"
    print_info "\nView logs:"
    print_info "  docker-compose -f docker-compose.prod.yml logs -f"
}

# Stop services
stop_services() {
    print_info "\n🛑 Stopping services...\n"
    
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml down
    else
        docker-compose down
    fi
    
    print_success "Services stopped"
}

# Show status
show_status() {
    print_info "\n📊 Service Status:\n"
    
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml ps
    else
        docker-compose ps
    fi
    
    print_info "\n🏥 Health Checks:\n"
    
    # Backend health
    if curl -f http://localhost:3000/health 2>/dev/null; then
        print_success "Backend: healthy"
    else
        print_error "Backend: unhealthy or not running"
    fi
    
    # Frontend health
    if curl -f http://localhost:8080/health 2>/dev/null; then
        print_success "Frontend: healthy"
    else
        print_error "Frontend: unhealthy or not running"
    fi
}

# Show usage
usage() {
    print_info "Usage: $0 [command] [options]"
    print_info ""
    print_info "Commands:"
    print_info "  dev              Deploy in development mode"
    print_info "  prod             Deploy in production mode"
    print_info "  stop [prod]      Stop services (add 'prod' for production)"
    print_info "  status [prod]    Show service status (add 'prod' for production)"
    print_info "  help             Show this help message"
    print_info ""
    print_info "Examples:"
    print_info "  $0 dev           # Start development environment"
    print_info "  $0 prod          # Start production environment"
    print_info "  $0 stop          # Stop development environment"
    print_info "  $0 stop prod     # Stop production environment"
    print_info "  $0 status        # Check development status"
}

# Main script
case "$1" in
    dev)
        deploy_dev
        ;;
    prod)
        deploy_prod
        ;;
    stop)
        stop_services "$2"
        ;;
    status)
        show_status "$2"
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        print_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
