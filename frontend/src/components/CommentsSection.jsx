import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  ThumbsUp, 
  Reply, 
  Edit, 
  Trash2, 
  Send, 
  User,
  Clock,
  MoreVertical,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { commentsAPI } from '@/lib/api';
import {
  hasLikedComment,
  markLikedComment,
  unmarkLikedComment,
  mergeIsLikedInCommentList
} from '@/utils/commentLikesStore';
import { formatTimeAgo } from '@/utils/time';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from './UserAvatar';
import { toast } from 'sonner';

const CommentsSection = ({ promptId }) => {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  // Buscar comentários
  useEffect(() => {
    if (promptId) {
      fetchComments();
    }
  }, [promptId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await commentsAPI.getByPrompt(promptId);
      // Mesclar informações de curtidas locais para usuários não logados
      const list = response.data.comments || [];
      const withLocal = mergeIsLikedInCommentList(list);
      setComments(withLocal);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      toast.error('Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  };

  // Criar novo comentário
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await commentsAPI.create(promptId, { conteudo: newComment });
      setComments(prev => [response.data.comment, ...prev]);
      setNewComment('');
      toast.success('Comentário adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  // Editar comentário
  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      const response = await commentsAPI.update(commentId, { conteudo: editContent });
      setComments(prev => prev.map(comment => 
        comment.id === commentId ? { ...comment, conteudo: editContent } : comment
      ));
      setEditingComment(null);
      setEditContent('');
      toast.success('Comentário atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao editar comentário:', error);
      toast.error('Erro ao editar comentário');
    }
  };

  // Excluir comentário
  const handleDeleteComment = async (commentId) => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

    try {
      await commentsAPI.delete(commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast.success('Comentário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      toast.error('Erro ao excluir comentário');
    }
  };

  // Curtir comentário
  const handleLikeComment = async (commentId) => {
    // Se autenticado, envia para API. Caso contrário, manipula somente localmente.
    if (isAuthenticated) {
      try {
        await commentsAPI.like(commentId);
        // Atualizar estado local (implementação otimista)
        setComments((prev) =>
          prev.map((comment) => {
            if (comment.id === commentId) {
              const isLiked = !comment.isLiked;
              return {
                ...comment,
                isLiked,
                likes: isLiked ? comment.likes + 1 : Math.max(0, comment.likes - 1),
              };
            }
            return comment;
          })
        );
      } catch (error) {
        console.error('Erro ao curtir comentário:', error);
        // Reverter mudança otimista em caso de erro
        setComments((prev) =>
          prev.map((comment) => {
            if (comment.id === commentId) {
              const isLiked = !comment.isLiked;
              return {
                ...comment,
                isLiked,
                likes: isLiked
                  ? Math.max(0, comment.likes - 1)
                  : comment.likes + 1,
              };
            }
            return comment;
          })
        );
      }
    } else {
      // Usuário não autenticado: curtida é armazenada localmente
      const alreadyLiked = hasLikedComment(commentId);
      if (alreadyLiked) {
        unmarkLikedComment(commentId);
      } else {
        markLikedComment(commentId);
      }
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            const newLiked = !alreadyLiked;
            return {
              ...comment,
              isLiked: newLiked,
              likes: newLiked ? comment.likes + 1 : Math.max(0, comment.likes - 1),
            };
          }
          return comment;
        })
      );
    }
  };

  // A formatação de tempo agora vem do util compartilhado (formatTimeAgo)

  const canEditComment = (comment) => {
    return isAuthenticated && user && (
      String(user.id) === String(comment.usuarios?.id) || 
      user.e_moderador
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Comentários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-16 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="h-5 w-5 mr-2" />
          Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário para novo comentário */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <div className="flex space-x-3">
              <UserAvatar user={user} size="md" />
              <div className="flex-1">
                <Textarea
                  placeholder="Adicione um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end mt-2">
                  <Button type="submit" disabled={submitting || !newComment.trim()}>
                    {submitting ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Comentar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Faça login para comentar</p>
          </div>
        )}

        {/* Lista de comentários */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-l-2 border-muted pl-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <UserAvatar user={comment.usuarios} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-foreground">
                          {comment.usuarios?.nome || 'Usuário'}
                        </span>
                        {comment.usuarios?.cargo && (
                          <Badge variant="outline" className="text-xs">
                            {comment.usuarios.cargo}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(comment.criado_em)}
                        </span>
                      </div>
                      
                      {canEditComment(comment) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingComment(comment.id);
                              setEditContent(comment.conteudo);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    
                    {editingComment === comment.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleEditComment(comment.id)}
                            disabled={!editContent.trim()}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingComment(null);
                              setEditContent('');
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-foreground whitespace-pre-wrap">
                        {comment.conteudo}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikeComment(comment.id)}
                        className={`h-8 ${comment.isLiked ? 'text-accent' : 'text-muted-foreground'}`}
                      >
                        <ThumbsUp className={`h-4 w-4 mr-1 ${comment.isLiked ? 'fill-current' : ''}`} />
                        {comment.likes || 0}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommentsSection;
