# 🏠 Chez les Giros

Application familiale pour organiser les soirées, les tâches et les courses.

---

## Déploiement — étape par étape

### Étape 1 — Créer la base de données (Supabase)

1. Va sur [supabase.com](https://supabase.com) → crée un compte gratuit
2. Clique **"New project"** → appelle-le `chez-les-giros`
3. Choisis un mot de passe (note-le quelque part) → clique **"Create new project"**
4. Attends ~2 minutes que le projet se crée
5. Dans le menu de gauche, clique **"SQL Editor"**
6. Copie-colle **tout le contenu** du fichier `supabase/schema.sql` dans l'éditeur
7. Clique **"Run"** (bouton vert) — tu devrais voir "Success"
8. Dans le menu de gauche, clique **"Project Settings" → "API"**
9. Note ces deux valeurs :
   - **Project URL** (ressemble à `https://abcdefgh.supabase.co`)
   - **anon public** key (longue chaîne de caractères)

---

### Étape 2 — Mettre le code sur GitHub

1. Va sur [github.com](https://github.com) → crée un compte gratuit
2. Télécharge **GitHub Desktop** sur [desktop.github.com](https://desktop.github.com) → installe-le
3. Ouvre GitHub Desktop → connecte ton compte GitHub
4. Clique **"Add an Existing Repository from your Hard Drive"**
5. Sélectionne le dossier `chez-les-giros` (le dossier que tu as reçu de Claude)
6. GitHub Desktop va te dire "This folder is not a Git repository" → clique **"create a repository"**
7. Clique **"Publish repository"** → décoche "Keep this code private" si tu veux → clique **"Publish"**

---

### Étape 3 — Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) → clique **"Sign up"** → **"Continue with GitHub"**
2. Autorise Vercel à accéder à ton GitHub
3. Clique **"Add New Project"**
4. Tu verras ton repo `chez-les-giros` dans la liste → clique **"Import"**
5. Avant de déployer, clique sur **"Environment Variables"** et ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL` → colle ta Project URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → colle ta clé anon de Supabase
6. Clique **"Deploy"** → attends ~2 minutes
7. 🎉 Vercel te donne une URL du type `chez-les-giros.vercel.app` — c'est ton app !

---

### Étape 4 — Partager avec la famille

1. Envoie le lien Vercel à tout le monde par WhatsApp
2. Sur iPhone : ouvre le lien dans Safari → bouton Partager → **"Sur l'écran d'accueil"**
3. Sur Android : ouvre dans Chrome → menu ⋮ → **"Ajouter à l'écran d'accueil"**
4. L'app apparaît comme une vraie appli sur le téléphone !

---

## Fonctionnalités

- **Ce soir** — chacun dit s'il rentre, à quelle heure, et si on lui garde une assiette. Résumé visible pour tout le monde en haut.
- **Tâches à faire** — Elisabeth ajoute les corvées, chacun se les assigne, les marque comme faites.
- **Courses** — liste partagée en temps réel, tout le monde peut ajouter et cocher.
- **Poubelles** — rappel 🟡 le mercredi (jaune) et 🟤 le mardi & vendredi (marron).

## Stack technique (tout gratuit)

- **Next.js 14** — framework React
- **Supabase** — base de données + temps réel
- **Vercel** — hébergement
- **PWA** — installable sur mobile comme une vraie app

## Mises à jour

Si tu veux changer quelque chose dans l'app (textes, couleurs, fonctionnalités), dis-le à Claude dans Cowork. Il modifiera le code, et tu n'auras qu'à :
1. Ouvrir GitHub Desktop
2. Cliquer "Push origin"
3. Vercel redéploiera automatiquement en ~1 minute.
