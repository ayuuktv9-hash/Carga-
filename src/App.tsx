import React, { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useLocation 
} from 'react-router-dom';
import { 
  auth, 
  db 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  Timestamp,
  getDoc,
  setDoc,
  where,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { 
  Home as HomeIcon, 
  PlusSquare, 
  User as UserIcon, 
  LayoutDashboard, 
  LogOut, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Heart, 
  Trash2, 
  Upload as UploadIcon,
  X,
  MoreVertical,
  Search,
  Menu,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { Post, UserProfile, OperationType, FirestoreErrorInfo, MediaType } from './types';

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Algo salió mal. Por favor, intenta recargar la página.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error.includes("Missing or insufficient permissions")) {
          errorMessage = "No tienes permisos para ver este contenido. Asegúrate de haber iniciado sesión.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Ups! Algo falló</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Components ---

const Navbar = ({ user }: { user: User | null }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Inicio', path: '/', icon: HomeIcon },
    { name: 'Panel', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Perfil', path: '/profile', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 md:top-0 md:bottom-auto md:border-t-0 md:border-b md:flex md:items-center md:justify-between z-50">
      <div className="hidden md:flex items-center gap-2 font-bold text-xl text-indigo-600">
        <UploadIcon className="w-8 h-8" />
        <span>MediaShare Pro</span>
      </div>

      <div className="flex justify-around items-center md:gap-8">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors md:flex-row md:gap-2",
              location.pathname === item.path ? "text-indigo-600" : "text-gray-500 hover:text-indigo-400"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-medium md:text-sm">{item.name}</span>
          </Link>
        ))}
        {user && (
          <button
            onClick={() => signOut(auth)}
            className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-red-500 md:flex-row md:gap-2"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-xs font-medium md:text-sm">Salir</span>
          </button>
        )}
      </div>

      <div className="hidden md:flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-2">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border" />
            <span className="text-sm font-medium">{user.displayName}</span>
          </div>
        ) : (
          <button 
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Iniciar Sesión
          </button>
        )}
      </div>
    </nav>
  );
};

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  isOwner: boolean;
  key?: React.Key;
}

const PostCard = ({ post, onLike, onDelete, isOwner }: PostCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={post.authorPhoto || ''} alt="" className="w-10 h-10 rounded-full border" />
          <div>
            <h3 className="font-semibold text-sm">{post.authorName}</h3>
            <p className="text-xs text-gray-500">{format(post.createdAt.toDate(), 'dd MMM, yyyy')}</p>
          </div>
        </div>
        {isOwner && (
          <button onClick={() => onDelete(post.id)} className="text-gray-400 hover:text-red-500 p-1">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="px-4 pb-2">
        <h4 className="font-bold text-lg">{post.title}</h4>
        {post.description && <p className="text-gray-600 text-sm mt-1">{post.description}</p>}
      </div>

      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
        {post.type === 'image' && (
          <img src={post.content} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        )}
        {post.type === 'video' && (
          <video src={post.content} controls className="w-full h-full object-contain" />
        )}
        {post.type === 'file' && (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-16 h-16 text-indigo-400" />
            <span className="text-sm font-medium text-gray-600">{post.fileName}</span>
            <a 
              href={post.content} 
              download={post.fileName}
              className="text-indigo-600 text-xs font-bold hover:underline"
            >
              Descargar Archivo
            </a>
          </div>
        )}
      </div>

      <div className="p-4 flex items-center gap-4 border-t border-gray-50">
        <button 
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
        >
          <Heart className={cn("w-6 h-6", (post.likes || 0) > 0 && "fill-red-500 text-red-500")} />
          <span className="text-sm font-medium">{post.likes || 0}</span>
        </button>
      </div>
    </motion.div>
  );
};

const UploadModal = ({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: User }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MediaType>('image');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 1024 * 1024) {
        setError('El archivo es demasiado grande (máx 1MB).');
        return;
      }
      setFile(selectedFile);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);

      // Auto-detect type
      if (selectedFile.type.startsWith('image/')) setType('image');
      else if (selectedFile.type.startsWith('video/')) setType('video');
      else setType('file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setLoading(true);
    try {
      const postData = {
        authorId: user.uid,
        authorName: user.displayName || 'Usuario',
        authorPhoto: user.photoURL || '',
        title,
        description,
        type,
        content: preview || '',
        fileName: file.name,
        fileSize: file.size,
        createdAt: serverTimestamp(),
        likes: 0
      };

      await addDoc(collection(db, 'posts'), postData);
      onClose();
      setTitle('');
      setDescription('');
      setFile(null);
      setPreview(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold">Publicar Nuevo</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="¿De qué trata esto?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
              placeholder="Añade una descripción opcional..."
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as MediaType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="image">Imagen</option>
                <option value="video">Video</option>
                <option value="file">Archivo</option>
              </select>
            </div>
          </div>

          <div 
            className={cn(
              "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer",
              preview ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"
            )}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input 
              id="file-upload"
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            />
            {preview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                {type === 'image' && <img src={preview} alt="Preview" className="w-full h-full object-cover" />}
                {type === 'video' && <video src={preview} className="w-full h-full object-cover" />}
                {type === 'file' && <div className="flex flex-col items-center"><FileText className="w-12 h-12 text-indigo-500" /><span>{file?.name}</span></div>}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white font-bold">Cambiar archivo</span>
                </div>
              </div>
            ) : (
              <>
                <UploadIcon className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Haz clic para subir (Máx 1MB)</p>
              </>
            )}
          </div>

          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

          <button 
            type="submit"
            disabled={loading || !file || !title}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Publicando...' : 'Publicar Ahora'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Pages ---

const HomePage = ({ user }: { user: User | null }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      // Only handle error if it's not a permission error for unauthenticated users (which we already guard against, but just in case)
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLike = async (postId: string) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    if (post) {
      await updateDoc(postRef, { likes: (post.likes || 0) + 1 });
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta publicación?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-20 pb-24 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Explorar</h1>
        {user && (
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-all"
          >
            <PlusSquare className="w-6 h-6" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Cargando contenido...</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map((post: Post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onLike={handleLike} 
              onDelete={handleDelete}
              isOwner={user?.uid === post.authorId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">No hay publicaciones</h2>
          <p className="text-gray-500">¡Sé el primero en compartir algo!</p>
        </div>
      )}

      {user && (
        <UploadModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)} 
          user={user} 
        />
      )}
    </div>
  );
};

const DashboardPage = ({ user }: { user: User | null }) => {
  const [stats, setStats] = useState({ total: 0, images: 0, videos: 0, files: 0, likes: 0 });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'posts'), where('authorId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
      const newStats = posts.reduce((acc, post) => {
        acc.total++;
        if (post.type === 'image') acc.images++;
        if (post.type === 'video') acc.videos++;
        if (post.type === 'file') acc.files++;
        acc.likes += (post.likes || 0);
        return acc;
      }, { total: 0, images: 0, videos: 0, files: 0, likes: 0 });
      
      setStats(newStats);
      setRecentPosts(posts.slice(0, 5));
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return (
    <div className="flex flex-col items-center justify-center h-screen">
      <LayoutDashboard className="w-16 h-16 text-gray-300 mb-4" />
      <h2 className="text-2xl font-bold">Inicia sesión para ver tu panel</h2>
      <button 
        onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
        className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold"
      >
        Iniciar Sesión
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pt-20 pb-24 px-4">
      <h1 className="text-3xl font-extrabold mb-8">Panel de Control</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Posts', value: stats.total, icon: PlusSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Imágenes', value: stats.images, icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Videos', value: stats.videos, icon: Video, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Likes Totales', value: stats.likes, icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className={cn("p-6 rounded-2xl border border-gray-100 shadow-sm", stat.bg)}>
            <stat.icon className={cn("w-8 h-8 mb-2", stat.color)} />
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">Publicaciones Recientes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentPosts.length > 0 ? recentPosts.map(post => (
            <div key={post.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                  {post.type === 'image' && <img src={post.content} className="w-full h-full object-cover" />}
                  {post.type === 'video' && <Video className="w-6 h-6 text-gray-400" />}
                  {post.type === 'file' && <FileText className="w-6 h-6 text-gray-400" />}
                </div>
                <div>
                  <p className="font-bold text-sm">{post.title}</p>
                  <p className="text-xs text-gray-500">{format(post.createdAt.toDate(), 'dd MMM, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-gray-500">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs">{post.likes || 0}</span>
                </div>
                <button 
                  onClick={async () => {
                    if (window.confirm('¿Eliminar?')) await deleteDoc(doc(db, 'posts', post.id));
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-gray-500">No tienes publicaciones recientes.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = ({ user }: { user: User | null }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
        setBio(docSnap.data().bio || '');
      } else {
        const newProfile = {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          bio: '',
          createdAt: serverTimestamp()
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile as any);
      }
    };

    fetchProfile();

    const q = query(collection(db, 'posts'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[]);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveBio = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { bio });
    setIsEditing(false);
    setProfile(prev => prev ? { ...prev, bio } : null);
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center h-screen">
      <UserIcon className="w-16 h-16 text-gray-300 mb-4" />
      <h2 className="text-2xl font-bold">Inicia sesión para ver tu perfil</h2>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pt-20 pb-24 px-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-4">
            <img 
              src={user.photoURL || ''} 
              alt="" 
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg" 
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{user.displayName}</h1>
              <p className="text-gray-500 font-medium">{user.email}</p>
            </div>
            <button 
              onClick={() => isEditing ? handleSaveBio() : setIsEditing(true)}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              {isEditing ? 'Guardar Perfil' : 'Editar Perfil'}
            </button>
          </div>
          
          <div className="mt-6">
            {isEditing ? (
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                placeholder="Escribe algo sobre ti..."
              />
            ) : (
              <p className="text-gray-600 leading-relaxed">
                {profile?.bio || 'No hay biografía disponible.'}
              </p>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Mis Publicaciones</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {userPosts.map((post: Post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onLike={() => {}} 
            onDelete={async (id) => {
              if (window.confirm('¿Eliminar?')) await deleteDoc(doc(db, 'posts', id));
            }}
            isOwner={true}
          />
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Navbar user={user} />
          
          <main className="pb-20 md:pb-0 md:pt-16">
            <Routes>
              <Route path="/" element={<HomePage user={user} />} />
              <Route path="/dashboard" element={<DashboardPage user={user} />} />
              <Route path="/profile" element={<ProfilePage user={user} />} />
            </Routes>
          </main>

          <AnimatePresence>
            {!user && (
              <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-20 left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-80 bg-indigo-600 text-white p-6 rounded-2xl shadow-2xl z-40"
              >
                <h3 className="font-bold text-lg mb-2">¡Únete a la comunidad!</h3>
                <p className="text-sm text-indigo-100 mb-4">Inicia sesión para compartir tus fotos, videos y archivos con el mundo.</p>
                <button 
                  onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                  className="w-full bg-white text-indigo-600 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                >
                  Iniciar con Google
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
