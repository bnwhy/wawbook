#!/bin/bash
set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Redémarrage du serveur...${NC}"

# Arrêt du serveur
echo -e "${YELLOW}⏹️  Arrêt des processus existants...${NC}"
killall -9 node tsx 2>/dev/null || echo -e "${GREEN}✓ Aucun processus à arrêter${NC}"

# Attente pour s'assurer que les ports sont libérés
sleep 2

# Vérification de l'existence du workspace
if [ ! -d "/home/runner/workspace" ]; then
  echo -e "${RED}❌ Erreur: Le répertoire /home/runner/workspace n'existe pas${NC}"
  exit 1
fi

# Changement de répertoire
cd /home/runner/workspace

# Vérification de package.json
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Erreur: package.json introuvable${NC}"
  exit 1
fi

# Démarrage du serveur
echo -e "${GREEN}🚀 Démarrage du serveur...${NC}"
npm run dev
