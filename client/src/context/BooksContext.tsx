import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BookProduct } from '../types/admin';
import { INITIAL_BOOKS } from '../data/initialBooks';

interface BooksContextType {
  books: BookProduct[];
  addBook: (book: BookProduct) => void;
  updateBook: (book: BookProduct) => void;
  deleteBook: (bookId: string) => void;
  getBookById: (id: string) => BookProduct | undefined;
}

const BooksContext = createContext<BooksContextType | undefined>(undefined);

export const BooksProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<BookProduct[]>(() => {
    try {
      // Changed key to force refresh of data structure with new image generation logic
      const savedBooks = localStorage.getItem('admin_books_v3');
      return savedBooks ? JSON.parse(savedBooks) : INITIAL_BOOKS;
    } catch (error) {
      console.error('Failed to load books from localStorage:', error);
      return INITIAL_BOOKS;
    }
  });

  // Persist to localStorage whenever books change
  React.useEffect(() => {
    try {
      localStorage.setItem('admin_books_v3', JSON.stringify(books));
    } catch (error) {
      console.error('Failed to save books to localStorage:', error);
    }
  }, [books]);

  const addBook = (book: BookProduct) => {
    setBooks(prev => [...prev, book]);
  };

  const updateBook = (updatedBook: BookProduct) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
  };

  const deleteBook = (bookId: string) => {
    setBooks(prev => prev.filter(b => b.id !== bookId));
  };

  const getBookById = (id: string) => {
    return books.find(b => b.id === id);
  };

  return (
    <BooksContext.Provider value={{ books, addBook, updateBook, deleteBook, getBookById }}>
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
