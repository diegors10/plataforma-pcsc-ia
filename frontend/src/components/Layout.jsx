import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Brain, 
  FileText, 
  MessageCircle, 
  BookOpen, 
  Info, 
  User,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from './ThemeToggle';
import pcscLogo from '@/assets/pcsc-logo.jpg';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const Layout = ({ children }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Início', href: '/', icon: Brain },
    { name: 'Prompts', href: '/prompts', icon: FileText },
    { name: 'Discussões', href: '/discussoes', icon: MessageCircle },
    { name: 'Boas Práticas', href: '/boas-praticas', icon: BookOpen },
    { name: 'Sobre', href: '/sobre', icon: Info },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const NavLinks = ({ mobile = false }) => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => mobile && setIsOpen(false)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              isActive(item.href)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            } ${mobile ? 'w-full justify-start' : ''}`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src={pcscLogo} 
                alt="PCSC Logo" 
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-primary">PCSC-IA</h1>
                <p className="text-xs text-muted-foreground">Plataforma Colaborativa</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <NavLinks />
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              {/* Desktop user/profile or login */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden sm:flex">
                      <User className="h-4 w-4 mr-2" />
                      {user.nome?.split(' ')[0] || 'Perfil'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      Bem-vindo, {user.nome?.split(' ')[0] || 'Usuário'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                  <Link to="/login" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Login/Cadastro
                  </Link>
                </Button>
              )}

              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col space-y-4 mt-6">
                    <div className="flex items-center space-x-3 pb-4 border-b">
                      <img 
                        src={pcscLogo} 
                        alt="PCSC Logo" 
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div>
                        <h2 className="font-semibold text-primary">PCSC-IA</h2>
                        <p className="text-xs text-muted-foreground">Plataforma Colaborativa</p>
                      </div>
                    </div>
                    <nav className="flex flex-col space-y-2">
                      <NavLinks mobile />
                    </nav>
                    <div className="pt-4 border-t">
                      {user ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start">
                              <User className="h-4 w-4 mr-2" />
                              {user.nome?.split(' ')[0] || 'Perfil'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => {
                              setIsOpen(false);
                              navigate('/profile');
                            }}>
                              Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setIsOpen(false);
                              logout();
                            }}>
                              Sair
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setIsOpen(false)}>
                          <Link to="/login" className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Login/Cadastro
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img 
                  src={pcscLogo} 
                  alt="PCSC Logo" 
                  className="h-8 w-8 rounded-full object-cover"
                />
                <h3 className="font-semibold text-primary">PCSC-IA</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma Colaborativa de Inteligência Artificial da Polícia Civil de Santa Catarina.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Links Rápidos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/prompts" className="hover:text-foreground transition-colors">Prompts</Link></li>
                <li><Link to="/discussoes" className="hover:text-foreground transition-colors">Discussões</Link></li>
                <li><Link to="/boas-praticas" className="hover:text-foreground transition-colors">Boas Práticas</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/sobre" className="hover:text-foreground transition-colors">Sobre</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Ajuda</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Polícia Civil de Santa Catarina. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
