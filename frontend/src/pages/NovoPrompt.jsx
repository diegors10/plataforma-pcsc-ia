import React, { useState, useEffect } from 'react';
// import useNavigate only once (already imported above)
import {
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Info,
  X,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { promptsAPI, specialtiesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const NovoPrompt = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});

  // Categorias (especialidades) vindas da API
  const [categories, setCategories] = useState([]); // sempre array de strings
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    tags: [],
    isPublic: true
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchCategories();
    // Se o usuário não estiver autenticado, redireciona para o login
    if (!isAuthenticated) {
      toast.error('Você precisa estar logado para criar um prompt');
      navigate('/login', { state: { message: 'Você precisa estar logado para criar um prompt.' } });
    }
  }, [isAuthenticated, navigate]);

  // Carrega especialidades de /api/specialties e normaliza para nomes (strings)
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const resp = await specialtiesAPI.getAll(); // GET /api/specialties
      const items = resp?.data?.specialties || resp?.data || [];

      // Normaliza { name } a partir de várias possíveis chaves de backend
      const names = items
        .map((s) => s?.nome ?? s?.name ?? s?.titulo ?? '')
        .filter((n) => !!n)
        .map((n) => String(n));

      // remove duplicados + ordena
      const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      setCategories(unique);
    } catch (error) {
      console.error('Erro ao buscar especialidades:', error);
      toast.error('Erro ao carregar categorias (especialidades).');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Título é obrigatório';
    else if (formData.title.length < 5) newErrors.title = 'Título deve ter pelo menos 5 caracteres';
    else if (formData.title.length > 100) newErrors.title = 'Título deve ter no máximo 100 caracteres';

    if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatória';
    else if (formData.description.length < 20) newErrors.description = 'Descrição deve ter pelo menos 20 caracteres';
    else if (formData.description.length > 500) newErrors.description = 'Descrição deve ter no máximo 500 caracteres';

    if (!formData.content.trim()) newErrors.content = 'Conteúdo do prompt é obrigatório';
    else if (formData.content.length < 50) newErrors.content = 'Conteúdo deve ter pelo menos 50 caracteres';
    else if (formData.content.length > 5000) newErrors.content = 'Conteúdo deve ter no máximo 5000 caracteres';

    if (!formData.category) newErrors.category = 'Categoria é obrigatória';

    if (formData.tags.length === 0) newErrors.tags = 'Adicione pelo menos uma tag';
    else if (formData.tags.length > 10) newErrors.tags = 'Máximo de 10 tags permitidas';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleAddTag = () => {
    const tag = (tagInput || '').trim().toLowerCase();
    if (!tag) return toast.error('Digite uma tag válida');
    if (tag.length < 2) return toast.error('Tag deve ter pelo menos 2 caracteres');
    if (tag.length > 20) return toast.error('Tag deve ter no máximo 20 caracteres');
    if (formData.tags.includes(tag)) return toast.error('Esta tag já foi adicionada');
    if (formData.tags.length >= 10) return toast.error('Máximo de 10 tags permitidas');

    setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput('');
    if (errors.tags) setErrors((prev) => ({ ...prev, tags: undefined }));
  };

  const handleRemoveTag = (t) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== t) }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      setLoading(true);
      // payload compatível com o backend
      const payload = {
        titulo: formData.title.trim(),
        descricao: formData.description.trim(),
        conteudo: formData.content.trim(),
        categoria: formData.category, // string (nome da especialidade)
        tags: formData.tags,
        e_publico: formData.isPublic
      };
      await promptsAPI.create(payload);

      // AJUSTE GPT: removido className custom para usar cores padrão definidas no Toaster
      toast.success('Prompt criado com sucesso!', {
        description: 'Seu prompt foi publicado e está disponível para a comunidade.',
      });
      navigate('/prompts');
    } catch (error) {
      console.error('Erro ao criar prompt:', error);
      toast.error('Erro ao criar prompt', { description: 'Tente novamente em alguns instantes.'});
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (formData.title || formData.description || formData.content) {
      if (window.confirm('Tem certeza que deseja cancelar? Todas as alterações serão perdidas.')) {
        navigate('/prompts');
      }
    } else {
      navigate('/prompts');
    }
  };

  const getCharacterCount = (text, max) => {
    const count = text.length;
    const percentage = (count / max) * 100;
    let colorClass = 'text-muted-foreground';
    if (percentage > 90) colorClass = 'text-red-500';
    else if (percentage > 75) colorClass = 'text-yellow-500';
    return { count, colorClass };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Novo Prompt</h1>
              <p className="text-muted-foreground">Compartilhe seu conhecimento com a comunidade</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPreview ? 'Ocultar' : 'Visualizar'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Prompt</CardTitle>
                <CardDescription>Preencha as informações para criar um novo prompt</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Título */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Título *{' '}
                      <span className={getCharacterCount(formData.title, 100).colorClass}>
                        ({getCharacterCount(formData.title, 100).count}/100)
                      </span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="Ex: Análise de Evidências Digitais"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={errors.title ? 'border-red-500' : ''}
                      maxLength={100}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Descrição *{' '}
                      <span className={getCharacterCount(formData.description, 500).colorClass}>
                        ({getCharacterCount(formData.description, 500).count}/500)
                      </span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva brevemente o que este prompt faz e quando deve ser usado..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className={`min-h-[100px] ${errors.description ? 'border-red-500' : ''}`}
                      maxLength={500}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* Categoria (Especialidade) */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange('category', value)}
                      disabled={categoriesLoading}
                    >
                      <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder={categoriesLoading ? 'Carregando...' : 'Selecione uma categoria'} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.category}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags * ({formData.tags.length}/10)</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="tags"
                        placeholder="Digite uma tag e pressione Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        maxLength={20}
                      />
                      <Button type="button" onClick={handleAddTag} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="cursor-pointer">
                            #{tag}
                            <X className="h-3 w-3 ml-1 hover:text-red-500" onClick={() => handleRemoveTag(tag)} />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {errors.tags && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.tags}
                      </p>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="space-y-2">
                    <Label htmlFor="content">
                      Conteúdo do Prompt *{' '}
                      <span className={getCharacterCount(formData.content, 5000).colorClass}>
                        ({getCharacterCount(formData.content, 5000).count}/5000)
                      </span>
                    </Label>
                    <Textarea
                      id="content"
                      placeholder="Escreva o prompt completo aqui. Seja claro e específico sobre as instruções..."
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      className={`min-h-[300px] ${errors.content ? 'border-red-500' : ''}`}
                      maxLength={5000}
                    />
                    {errors.content && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.content}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-accent" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Publicar Prompt
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-500" />
                  Dicas para um bom prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium mb-1">Seja específico</h4>
                  <p className="text-muted-foreground">Descreva claramente o contexto e o objetivo do prompt.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Use exemplos</h4>
                  <p className="text-muted-foreground">Inclua exemplos de entrada e saída esperada.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Teste antes</h4>
                  <p className="text-muted-foreground">Verifique se o prompt funciona como esperado.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Tags relevantes</h4>
                  <p className="text-muted-foreground">Use tags que facilitem a busca por outros usuários.</p>
                </div>
              </CardContent>
            </Card>

            {showPreview && (
              <Card>
                <CardHeader>
                  <CardTitle>Visualização</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {formData.title && <h3 className="font-semibold text-lg">{formData.title}</h3>}
                    {formData.category && <Badge variant="secondary">{formData.category}</Badge>}
                    {formData.description && <p className="text-muted-foreground text-sm">{formData.description}</p>}
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {formData.content && (
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm whitespace-pre-wrap">
                          {formData.content.substring(0, 200)}
                          {formData.content.length > 200 && '...'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Status do Formulário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center">
                  {formData.title && !errors.title ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground mr-2" />
                  )}
                  Título
                </div>
                <div className="flex items-center">
                  {formData.description && !errors.description ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground mr-2" />
                  )}
                  Descrição
                </div>
                <div className="flex items-center">
                  {formData.category && !errors.category ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground mr-2" />
                  )}
                  Categoria
                </div>
                <div className="flex items-center">
                  {formData.tags.length > 0 && !errors.tags ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground mr-2" />
                  )}
                  Tags
                </div>
                <div className="flex items-center">
                  {formData.content && !errors.content ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground mr-2" />
                  )}
                  Conteúdo
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovoPrompt;
