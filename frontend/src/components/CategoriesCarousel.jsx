import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Search,
  FileText,
  Gavel,
  Shield,
  Brain,
  BookOpen,
  Computer,
  Microscope,
  Mic,
  Globe,
  ClipboardList,
  GraduationCap,
  Users,
  Scale
} from 'lucide-react';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

const CategoriesCarousel = ({ categories = [], onCategoryClick, onSelect }) => {
  // Ícones padrão utilizados quando o backend não fornece um ícone específico para a categoria.
  const categoryIcons = {
    'Investigação Digital': Database,
    'Análise Criminal': Search,
    'Documentação': FileText,
    'Direito Penal': Gavel,
    'Segurança Pública': Shield,
    'Inteligência': Brain,
    'Perícia': BookOpen,
  };

  // Mapeamento de nomes de ícones vindos do banco (coluna icone) para componentes do Lucide.
  // As chaves são normalizadas em minúsculas e sem hífens para simplificar a busca.
  const iconNameMap = {
    brain: Brain,
    shield: Shield,
    microscope: Microscope,
    mic: Mic,
    filetext: FileText,
    file: FileText,
    globe: Globe,
    clipboardlist: ClipboardList,
    graduationcap: GraduationCap,
    users: Users,
    scale: Scale,
    computer: Computer,
    search: Search,
    gavel: Gavel,
    bookopen: BookOpen,
  };

  // Cores associadas a categorias conhecidas. Caso a categoria não tenha cor definida no
  // backend, uma cor neutra será utilizada como fallback.
  const categoryColors = {
    'Investigação Digital': 'bg-blue-500',
    'Análise Criminal': 'bg-green-500',
    'Documentação': 'bg-purple-500',
    'Direito Penal': 'bg-red-500',
    'Segurança Pública': 'bg-yellow-500',
    'Inteligência': 'bg-indigo-500',
    'Perícia': 'bg-orange-500',
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhuma categoria encontrada.
      </div>
    );
  }

  return (
    <div className="categories-carousel">
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={24}
        slidesPerView={2}
        autoplay={{ delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        navigation={categories.length > 6}
        pagination={categories.length > 6 ? { clickable: true } : false}
        loop={categories.length > 1}
        breakpoints={{
          640: { slidesPerView: 3 },
          1024: { slidesPerView: 6 },
        }}
        className="categories-swiper"
      >
        {categories.map((category, index) => {
          // Aceita tanto `name` quanto `nome` vindos da API
          const label = category.name || category.nome || 'Categoria';
          const count = category.count ?? category.totalPrompts ?? 0;

          // Preparar handler (somente se houver callback e houver prompts)
          const hasHandler = typeof onCategoryClick === 'function' || typeof onSelect === 'function';
          const clickable = hasHandler && Number(count) > 0;

          const fireClick = () => {
            if (!clickable) return;
            if (typeof onCategoryClick === 'function') onCategoryClick(category);
            else if (typeof onSelect === 'function') onSelect(category);
          };

          const onKeyDown = (e) => {
            if (!clickable) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fireClick();
            }
          };

          // Ícone customizado definido pelo backend via `icone`.
          const rawIcon = category.icone || category.icon || null;
          let resolvedIconUrl = null;
          let IconComponent = null;
          if (rawIcon) {
            const hasExtension = /\.(svg|png|jpe?g|gif)$/i.test(rawIcon);
            const isPath = rawIcon.includes('/') || hasExtension;
            if (rawIcon.startsWith('http') || isPath) {
              if (rawIcon.startsWith('http')) {
                resolvedIconUrl = rawIcon;
              } else {
                const baseApi = (import.meta?.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
                const rootUrl = baseApi.replace(/\/api$/, '');
                const path = rawIcon.replace(/^\/*/, '');
                resolvedIconUrl = `${rootUrl}/${path}`;
              }
            } else {
              const key = rawIcon.toString().replace(/[-_]/g, '').toLowerCase();
              IconComponent = iconNameMap[key] || null;
            }
          }

          let iconElement;
          if (resolvedIconUrl) {
            iconElement = (
              <img
                src={resolvedIconUrl}
                alt={label}
                className="h-7 w-7 object-contain"
              />
            );
          } else if (IconComponent) {
            iconElement = <IconComponent className="h-7 w-7 text-white" />;
          } else {
            const DefaultIcon = categoryIcons[label] || Brain;
            iconElement = <DefaultIcon className="h-7 w-7 text-white" />;
          }

          const colorClass = category.cor || category.color || categoryColors[label] || 'bg-gray-500';

          return (
            <SwiperSlide key={`${label}-${index}`}>
              <Card
                className={`hover:shadow-xl transition-all duration-300 group hover:-translate-y-2 border-t-4 border-t-accent h-full ${
                  clickable ? 'cursor-pointer' : ''
                }`}
                onClick={fireClick}
                onKeyDown={onKeyDown}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : -1}
                aria-disabled={!clickable}
                data-category={label}
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-14 h-14 ${colorClass} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}
                  >
                    {iconElement}
                  </div>
                  <div className="mb-2 min-h-[3rem] flex items-center justify-center">
                    <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors duration-300 text-sm line-clamp-2">
                      {label}
                    </h3>
                  </div>
                  <div className="flex items-center justify-center">
                    <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
                      {count} prompts
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <style>{`
        .categories-swiper .swiper-pagination {
          bottom: -40px !important;
        }
        .categories-swiper .swiper-pagination-bullet {
          background: hsl(var(--accent)) !important;
          opacity: 0.5;
        }
        .categories-swiper .swiper-pagination-bullet-active {
          opacity: 1;
        }
        .categories-swiper .swiper-button-next,
        .categories-swiper .swiper-button-prev {
          color: hsl(var(--accent)) !important;
          top: 50% !important;
          margin-top: -22px !important;
        }
        .categories-swiper .swiper-button-next:after,
        .categories-swiper .swiper-button-prev:after {
          font-size: 20px !important;
        }
        .categories-swiper .swiper-button-disabled {
          opacity: 0.3 !important;
        }
      `}</style>
    </div>
  );
};

export default CategoriesCarousel;
