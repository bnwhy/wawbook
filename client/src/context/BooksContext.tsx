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
  const [books, setBooks] = useState<BookProduct[]>(INITIAL_BOOKS);

  const addBook = (book: BookProduct) => {
    setBooks([...books, book]);
  };

  const updateBook = (updatedBook: BookProduct) => {
    setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
  };

  const deleteBook = (bookId: string) => {
    setBooks(books.filter(b => b.id !== bookId));
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
