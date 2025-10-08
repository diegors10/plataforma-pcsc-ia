import React, { useEffect, useState } from 'react';
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
  BookOpen
} from 'lucide-react';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

const CategoriesCarousel = ({ categories = [] }) => {
  const [shouldAutoplay, setShouldAutoplay] = useState(false);

  const categoryIcons = {
    'Investigação Digital': Database,
    'Análise Criminal': Search,
    'Documentação': FileText,
    'Direito Penal': Gavel,
    'Segurança Pública': Shield,
    'Inteligência': Brain,
    'Perícia': BookOpen
  };

  const categoryColors = {
    'Investigação Digital': 'bg-blue-500',
    'Análise Criminal': 'bg-green-500',
    'Documentação': 'bg-purple-500',
    'Direito Penal': 'bg-red-500',
    'Segurança Pública': 'bg-yellow-500',
    'Inteligência': 'bg-indigo-500',
    'Perícia': 'bg-orange-500'
  };

  // Ativa autoplay apenas se houver mais itens que o visível em telas grandes
  useEffect(() => {
    setShouldAutoplay((categories?.length || 0) > 6);
  }, [categories]);

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
        autoplay={
          shouldAutoplay
            ? { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }
            : false
        }
        navigation={categories.length > 6}
        pagination={categories.length > 6 ? { clickable: true } : false}
        breakpoints={{
          640: { slidesPerView: 3 },
          1024: { slidesPerView: 6 }
        }}
        className="categories-swiper"
      >
        {categories.map((category, index) => {
          // Aceita tanto `name` quanto `nome` vindos da API
          const label = category.name || category.nome || 'Categoria';
          const count = category.count ?? category.totalPrompts ?? 0;

          const IconComponent = categoryIcons[label] || Brain;
          const colorClass = categoryColors[label] || 'bg-gray-500';

          return (
            <SwiperSlide key={`${label}-${index}`}>
              <Card className="hover:shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-2 border-t-4 border-t-accent h-full">
                <CardContent className="p-6 text-center">
                  <div className={`w-14 h-14 ${colorClass} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    <IconComponent className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-accent transition-colors duration-300 text-sm">
                    {label}
                  </h3>
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

      {/* REMOVIDO jsx/global: usar style comum no React */}
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
