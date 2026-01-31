import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookProduct } from '../types/admin';
import { INITIAL_BOOKS } from '../data/initialBooks';
import { toast } from 'sonner';

interface BooksContextType {
  books: BookProduct[];
  isLoading: boolean;
  addBook: (book: BookProduct) => Promise<void>;
  updateBook: (book: BookProduct) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  getBookById: (id: string) => BookProduct | undefined;
}

const BooksContext = createContext<BooksContextType | undefined>(undefined);

export const BooksProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch all books
  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const response = await fetch('/api/books');
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      const data = await response.json();
      // If no books in DB, initialize with default books
      if (data.length === 0) {
        // Initialize DB with default books
        await Promise.all(INITIAL_BOOKS.map(book =>
          fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book),
          })
        ));
        return INITIAL_BOOKS;
      }
      return data as BookProduct[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Add book mutation
  const addBookMutation = useMutation({
    mutationFn: async (book: BookProduct) => {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });
      if (!response.ok) {
        throw new Error('Failed to add book');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Livre ajouté avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout du livre');
    },
  });

  // Update book mutation
  const updateBookMutation = useMutation({
    mutationFn: async (book: BookProduct) => {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });
      if (!response.ok) {
        throw new Error('Failed to update book');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Livre mis à jour avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du livre');
    },
  });

  // Delete book mutation
  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: string) => {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete book');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Livre supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du livre');
    },
  });

  const addBook = async (book: BookProduct) => {
    await addBookMutation.mutateAsync(book);
  };

  const updateBook = async (book: BookProduct) => {
    // #region agent log
    fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BooksContext.tsx:114',message:'updateBook called',data:{bookId:book.id,bookName:book.name,galleryImages:book.galleryImages,galleryLength:book.galleryImages?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H_SAVE'})}).catch(()=>{});
    // #endregion
    await updateBookMutation.mutateAsync(book);
  };

  const deleteBook = async (bookId: string) => {
    await deleteBookMutation.mutateAsync(bookId);
  };

  const getBookById = (id: string) => {
    return books.find(b => b.id === id);
  };

  return (
    <BooksContext.Provider value={{ books, isLoading, addBook, updateBook, deleteBook, getBookById }}>
      {children}
    </BooksContext.Provider>
  );
};

export const useBooks = () => {
  const context = useContext(BooksContext);
  if (context === undefined) {
    throw new Error('useBooks must be used within a BooksProvider');
  }
  return context;
};
