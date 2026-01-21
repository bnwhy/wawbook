-- Script de nettoyage des enregistrements orphelins
-- Suppression des books de test dont les fichiers ont été supprimés

DELETE FROM books WHERE id IN (
  '1768849440754',
  '1768915884007',
  '1768916224485',
  '1768916363160',
  '1768936693733'
);

-- Vérifier qu'il n'y a pas d'autres enregistrements orphelins
-- SELECT id FROM books WHERE id NOT IN (SELECT DISTINCT book_id FROM orders WHERE book_id IS NOT NULL);
