/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Book, 
  Mic, 
  MicOff,
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  PenTool, 
  Calendar as CalendarIcon, 
  FileText,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Settings,
  Upload,
  X,
  FileUp,
  History,
  Sparkles,
  Image as ImageIcon,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { generateKonspek, refineKonspek, ocrImage, analyzeStyle, type GenerationMode, ai } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
// @ts-ignore
import html2pdf from 'html2pdf.js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Topic {
  id: string;
  title: string;
  date: string;
  pages: number;
  plan?: string;
  content?: string[];
  pageImages?: (string | null)[]; // Base64 images for each page
  fileContent?: string;
  fileName?: string;
  educationField?: string;
  subjectName?: string;
}

const FONTS = [
  { name: 'Klassik maktab', class: 'font-dancing', sample: 'Har bir harf qoidalarga muvofiq, o‘ngga 75 daraja qiya yozilgan, juda tushunarli uslub.', defaultFontSize: 24 },
  { name: 'Tezkor talaba', class: 'font-reenie', sample: 'Harflar bir-biriga tez ulanadi, ba’zi harflar deyarli bir xil ko\'rinadi.', defaultFontSize: 20 },
  { name: 'A’lochi qiz', class: 'font-badscript', sample: 'Juda mayda, dumaloq va chiroyli harflar. Hamma narsa tartibli.', defaultFontSize: 16 },
  { name: 'Erkakcha uslub', class: 'font-kalam', sample: 'Harflar bir-biridan ajralgan, biroz dag‘alroq va vertikal (qiya emas).', defaultFontSize: 22 },
  { name: 'Minimalist', class: 'font-shadows', sample: 'Ortiqcha ilgaklarsiz, juda oddiy va o‘qishga qulay zamonaviy yozuv.', defaultFontSize: 20 },
  { name: 'Vrach yozuvi', class: 'font-zeyada', sample: 'Faqat sarlavhalari o‘qiladigan, matn qismi esa to‘lqinsimon chiziqlarga o‘xshash.', defaultFontSize: 18 },
  { name: 'Qalin ruchka', class: 'font-marker', sample: '0.7 mm lik qalin ko‘k ruchkada yozilgandek effekt beradi.', defaultFontSize: 22 },
  { name: 'Ingichka layner', class: 'font-reenie', sample: 'Judayam ingichka va o‘tkir chiziqli yozuv.', defaultFontSize: 18 },
  { name: 'Bosh harfli', class: 'font-architects', sample: 'Muhim joylarni ajratib ko‘rsatish uchun ishlatiladigan bosma harflarga yaqin uslub.', defaultFontSize: 20 },
  { name: 'Badiiy', class: 'font-marck', sample: 'Bir oz dekorativ, harflarning uchlari uzunroq tortilgan uslub.', defaultFontSize: 20 },
  { name: 'Caveat', class: 'font-caveat', sample: 'Bu tabiiy qo\'lyozma uslubidagi namuna matn.', defaultFontSize: 22 },
  { name: 'Indie Flower', class: 'font-indie', sample: 'Maktab o\'quvchisi yozuviga o\'xshash uslub.', defaultFontSize: 18 },
  { name: 'Gloria Hallelujah', class: 'font-gloria', sample: 'Quvnoq va erkin qo\'lyozma uslubi.', defaultFontSize: 20 },
  { name: 'Patrick Hand', class: 'font-patrick', sample: 'Oddiy va tushunarli qo\'lyozma.', defaultFontSize: 20 },
  { name: 'Amatic SC', class: 'font-amatic', sample: 'Ingichka va baland harfli uslub.', defaultFontSize: 24 },
  { name: 'Handlee', class: 'font-handlee', sample: 'Yumshoq va o\'qishga qulay uslub.', defaultFontSize: 20 },
  { name: 'Nothing You Could Do', class: 'font-nothing', sample: 'Tez yozilgan qo\'lyozma effekti.', defaultFontSize: 18 },
  { name: 'Homemade Apple', class: 'font-homemade', sample: 'Klassik qo\'lyozma uslubi.', defaultFontSize: 20 },
  { name: 'Cedarville Cursive', class: 'font-cedarville', sample: 'Bog\'langan chiroyli qo\'lyozma.', defaultFontSize: 20 },
  { name: 'Nanum Pen Script', class: 'font-nanum', sample: 'O\'tkir uchli ruchka bilan yozilgandek.', defaultFontSize: 18 },
  { name: 'Waiting for Sunrise', class: 'font-waiting', sample: 'Nozik va baland qo\'lyozma.', defaultFontSize: 20 },
  { name: 'Just Me Again', class: 'font-justme', sample: 'Shaxsiy kundalik yozuviga o\'xshash.', defaultFontSize: 18 },
  { name: 'Delius', class: 'font-delius', sample: 'Komikslardagi yozuvga o\'xshash uslub.', defaultFontSize: 20 },
  { name: 'Gochi Hand', class: 'font-gochi', sample: 'Qalin va yumaloq harflar.', defaultFontSize: 22 },
  { name: 'Covered By Grace', class: 'font-covered', sample: 'Erkin va baland qo\'lyozma.', defaultFontSize: 20 },
  { name: 'La Belle Aurore', class: 'font-labelle', sample: 'Elegant va nozik qo\'lyozma.', defaultFontSize: 20 },
  { name: 'Coming Soon', class: 'font-comingsoon', sample: 'Oddiy va chiroyli qo\'lyozma.', defaultFontSize: 20 },
  { name: 'Loved by the King', class: 'font-lovedbyking', sample: 'Badiiy va o\'ziga xos uslub.', defaultFontSize: 20 },
  { name: 'Over the Rainbow', class: 'font-overrainbow', sample: 'Quvnoq va baland qo\'lyozma.', defaultFontSize: 20 },
  { name: 'Great Vibes', class: 'font-greatvibes', sample: 'Klassik va chiroyli bog\'langan yozuv.', defaultFontSize: 24 },
];

type AppStep = 'landing' | 'mode-selection' | 'config' | 'preview' | 'voice' | 'documents' | 'saved';

const NotebookStyleIcon = ({ type, active, isDarkMode }: { type: string, active: boolean, isDarkMode: boolean }) => {
  return (
    <div className={cn(
      "w-12 h-12 rounded-lg border flex flex-col gap-1 p-1.5 overflow-hidden mb-1 transition-all",
      active 
        ? (isDarkMode ? "border-blue-400 bg-blue-900/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "border-blue-300 bg-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.2)]")
        : (isDarkMode ? "border-neutral-700 bg-neutral-800" : "border-neutral-200 bg-white")
    )}>
      {type === 'chiziqli' && (
        <div className="flex flex-col gap-1.5 w-full">
          {[1, 2, 3, 4].map(i => <div key={i} className={cn("h-[1px] w-full", isDarkMode ? "bg-neutral-600" : "bg-neutral-300")} />)}
        </div>
      )}
      {type === 'katakli' && (
        <div className="grid grid-cols-4 gap-1 w-full h-full">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className={cn("border-[0.5px]", isDarkMode ? "border-neutral-700" : "border-neutral-200")} />
          ))}
        </div>
      )}
      {type === 'panjarali' && (
        <div className="grid grid-cols-4 gap-1.5 w-full h-full place-items-center">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className={cn("w-0.5 h-0.5 rounded-full", isDarkMode ? "bg-neutral-600" : "bg-neutral-400")} />
          ))}
        </div>
      )}
    </div>
  );
};

const WritingAnimation = ({ text, speed = 5, onComplete }: { text: string, speed?: number, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    
    const typeNextChar = () => {
      if (!isMounted) return;
      
      if (i >= text.length) {
        setDisplayedText(text);
        onComplete?.();
        return;
      }
      
      // Variable speed for realistic handwriting
      const char = text[i];
      let delay = Math.random() * 20 + 10; // 10-30ms base
      
      if (char === ' ') delay = 5;
      else if (['.', ',', '!', '?', '\n'].includes(char)) delay = 40;
      
      // If text is very long, speed it up significantly by taking larger steps
      if (text.length > 800) {
        delay = 5;
        i += Math.floor(Math.random() * 4) + 2; // Skip ahead 2-5 chars
      } else if (text.length > 300) {
        delay = 10;
        i += Math.floor(Math.random() * 2) + 1; // Skip ahead 1-2 chars
      } else {
        i++;
      }
      
      setDisplayedText(text.substring(0, i));
      timeoutId = setTimeout(typeNextChar, delay);
    };
    
    timeoutId = setTimeout(typeNextChar, 10);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [text, onComplete]);

  return (
    <>
      {displayedText}
      {displayedText.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-current animate-pulse align-middle ml-1 opacity-70"></span>
      )}
    </>
  );
};

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('landing');
  const [selectedMode, setSelectedMode] = useState<'realistic' | 'voice' | 'documents' | null>(null);
  const [notebookType, setNotebookType] = useState<string>('36');
  const [notebookStyle, setNotebookStyle] = useState<'katakli' | 'chiziqli' | 'panjarali'>('chiziqli');
  const [templates, setTemplates] = useState<any[]>([]);
  const [topics, setTopics] = useState<Topic[]>([
    { id: '1', title: '', date: new Date().toISOString().split('T')[0], pages: 1, plan: '' }
  ]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#1e3a8a'); // To'q ko'k (Siyoh)
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isOCRing, setIsOCRing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [docFile, setDocFile] = useState<{ name: string, type: string, content: string | null } | null>(null);
  const [docMode, setDocMode] = useState<'topic' | 'pages' | null>(null);
  const [docTopic, setDocTopic] = useState('');
  const [pageRange, setPageRange] = useState({ start: 1, end: 1 });
  const [activeDictation, setActiveDictation] = useState<{ topicId: string, pageIndex: number, baseContent: string } | null>(null);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('full');
  const [showModeModal, setShowModeModal] = useState(false);
  const [animatedPages, setAnimatedPages] = useState<Record<string, boolean>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('konspekt-app-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.topics) {
          const topicsWithIds = parsed.topics.map((t: any) => ({
            ...t,
            id: t.id || Math.random().toString(36).substr(2, 9)
          }));
          
          // Ensure unique IDs
          const uniqueTopics = topicsWithIds.filter((t: any, index: number, self: any[]) =>
            index === self.findIndex((t2) => t2.id === t.id)
          );
          
          setTopics(uniqueTopics);
        }
        if (parsed.selectedFont) setSelectedFont(parsed.selectedFont);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.fontColor) setFontColor(parsed.fontColor);
        if (parsed.notebookType) setNotebookType(parsed.notebookType);
        if (parsed.notebookStyle) setNotebookStyle(parsed.notebookStyle);
        if (parsed.templates) setTemplates(parsed.templates);
        if (parsed.isDarkMode !== undefined) setIsDarkMode(parsed.isDarkMode);
      } catch (e) {
        console.error('Failed to load state', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('konspekt-app-state', JSON.stringify({
          topics,
          selectedFont,
          fontSize,
          fontColor,
          notebookType,
          notebookStyle,
          templates,
          isDarkMode
        }));
      } catch (e) {

        console.warn('Failed to save state (might be too large)', e);
      }
    }
  }, [topics, selectedFont, fontSize, fontColor, notebookType, notebookStyle, templates, isDarkMode, isLoaded]);

  // Auto-adjust font size when font changes
  useEffect(() => {
    if (selectedFont.defaultFontSize) {
      setFontSize(selectedFont.defaultFontSize);
    }
  }, [selectedFont]);

  const handleStyleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const styleName = await analyzeStyle(base64);
          const foundFont = FONTS.find(f => f.name === styleName) || FONTS[0];
          setSelectedFont(foundFont);
          setFontSize(foundFont.defaultFontSize || 24);
        } catch (error) {
          console.error("Style Analysis Error:", error);
          alert("Uslubni aniqlashda xatolik yuz berdi.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDictating) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isDictating]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Refs for speech recognition callbacks to access latest state
  const isDictatingRef = useRef(isDictating);
  const activeDictationRef = useRef(activeDictation);
  const isListeningRef = useRef(isListening);
  const activeTopicIndexRef = useRef(activeTopicIndex);

  useEffect(() => {
    isDictatingRef.current = isDictating;
    activeDictationRef.current = activeDictation;
    isListeningRef.current = isListening;
    activeTopicIndexRef.current = activeTopicIndex;
  }, [isDictating, activeDictation, isListening, activeTopicIndex]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'uz-UZ';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (isDictatingRef.current && activeDictationRef.current) {
          const fullTranscript = (finalTranscript || interimTranscript);
          const currentDictation = activeDictationRef.current;
          setTopics(prev => prev.map(topic => {
            if (topic.id === currentDictation.topicId && topic.content) {
              const newPages = [...topic.content];
              newPages[currentDictation.pageIndex] = currentDictation.baseContent + (currentDictation.baseContent ? ' ' : '') + fullTranscript;
              return { ...topic, content: newPages };
            }
            return topic;
          }));
        } else if (isListeningRef.current) {
          const transcript = event.results[0][0].transcript;
          setTopics(prev => {
            const newTopics = [...prev];
            if (newTopics[activeTopicIndexRef.current]) {
              newTopics[activeTopicIndexRef.current] = {
                ...newTopics[activeTopicIndexRef.current],
                title: transcript
              };
            }
            return newTopics;
          });
        }
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setIsDictating(false);
      };

      recognitionRef.current.onend = () => {
        if (!isDictatingRef.current) {
          setIsListening(false);
        }
      };
    }
  }, []); // Initialize only once

  const handleDocUpload = async (file: File) => {
    setIsGenerating(true);
    try {
      let content = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        content = fullText;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else if (file.type === 'text/plain') {
        content = await file.text();
      } else {
        alert("Ushbu fayl turi qo'llab-quvvatlanmaydi.");
        return;
      }
      setDocFile({ name: file.name, type: file.type, content });
    } catch (error) {
      console.error("File Read Error:", error);
      alert("Faylni o'qishda xatolik yuz berdi.");
    } finally {
      setIsGenerating(false);
    }
  };

  const startListening = (index: number) => {
    setActiveTopicIndex(index);
    setIsDictating(false);
    if (recognitionRef.current) {
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      alert("Ovozli qidiruv brauzeringizda qo'llab-quvvatlanmaydi.");
    }
  };

  const startVoiceMode = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Sizning brauzeringiz ovozli yozishni qo'llab-quvvatlamaydi.");
      return;
    }
    
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'uz-UZ';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setVoiceText(prev => prev + finalTranscript);
    };

    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = () => setIsDictating(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const autoCompleteContent = async (topicId: string, pageIndex: number) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic || !topic.content) return;
    
    const currentContent = topic.content[pageIndex];
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Complete this text: ${currentContent}`,
    });
    
    const newContent = currentContent + (response.text || '');
    updatePageContent(topicId, pageIndex, newContent);
  };

  const startDictation = (topicId: string, pageIndex: number) => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      setActiveDictation(null);
      return;
    }

    const topic = topics.find(t => t.id === topicId);
    const baseContent = topic?.content?.[pageIndex] || '';

    setActiveDictation({ topicId, pageIndex, baseContent });
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      setIsDictating(true);
      recognitionRef.current.start();
    } else {
      alert("Ovozli qidiruv brauzeringizda qo'llab-quvvatlanmaydi.");
    }
  };

  const addTopic = () => {
    setTopics(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      title: '', 
      date: new Date().toISOString().split('T')[0], 
      pages: 12,
      plan: '',
      educationField: '',
      subjectName: ''
    }]);
  };

  const removeTopic = (id: string) => {
    setTopics(prev => prev.length > 1 ? prev.filter(t => t.id !== id) : prev);
  };

  const updateTopic = (id: string, field: keyof Topic, value: any) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        updateTopic(topics[index].id, 'fileContent', content);
        updateTopic(topics[index].id, 'fileName', file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleOCRUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const topicId = topics[index].id;
      setIsOCRing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const extractedText = await ocrImage(base64);
          updateTopic(topicId, 'fileContent', extractedText);
          updateTopic(topicId, 'fileName', file.name);
        } catch (error) {
          alert("Rasmdan matnni aniqlashda xatolik yuz berdi.");
        } finally {
          setIsOCRing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerGenerate = () => {
    const invalidTopic = topics.find(t => !t.educationField || !t.subjectName);
    if (invalidTopic) {
      alert("Iltimos, barcha mavzular uchun Ta'lim yo'nalishi va Fan nomini kiriting.");
      return;
    }
    const hasFile = topics.some(t => t.fileContent);
    if (hasFile) {
      setShowModeModal(true);
    } else {
      handleGenerate('full');
    }
  };

  const handleGenerate = async (mode: GenerationMode) => {
    setGenerationMode(mode);
    setShowModeModal(false);
    setIsGenerating(true);
    try {
      const generatedContents = await Promise.all(topics.map(async (topic) => {
        if (!topic.title && !topic.fileContent) return { id: topic.id, content: undefined };
        const rawContent = await generateKonspek(
          topic.title || (topic.fileName ? `Hujjat: ${topic.fileName}` : "Nomsiz mavzu"), 
          topic.pages, 
          topic.date, 
          mode, 
          topic.fileContent,
          undefined,
          undefined,
          undefined,
          undefined,
          topic.plan
        );
        const pages = rawContent?.split('---PAGE_BREAK---').map(p => p.trim()) || [];
        return { id: topic.id, content: pages };
      }));
      
      setTopics(prev => prev.map(topic => {
        const generated = generatedContents.find(g => g.id === topic.id);
        if (generated && generated.content) {
          return { ...topic, content: generated.content };
        }
        return topic;
      }));
      
      setAnimatedPages({});
      setIsAnimating(true);
      setCurrentStep('preview');
    } catch (error) {
      alert("Konspekt yaratishda xatolik yuz berdi.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const updatePageContent = (topicId: string, pageIndex: number, newContent: string, isAppend = false) => {
    setTopics(prev => prev.map(topic => {
      if (topic.id === topicId && topic.content) {
        const newPages = [...topic.content];
        newPages[pageIndex] = newContent;
        return { ...topic, content: newPages };
      }
      return topic;
    }));
  };

  const handlePageImageUpload = (topicId: string, pageIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setTopics(prev => prev.map(topic => {
          if (topic.id === topicId) {
            const newImages = [...(topic.pageImages || Array(topic.pages).fill(null))];
            newImages[pageIndex] = base64;
            return { ...topic, pageImages: newImages };
          }
          return topic;
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePageImage = (topicId: string, pageIndex: number) => {
    setTopics(prev => prev.map(topic => {
      if (topic.id === topicId && topic.pageImages) {
        const newImages = [...topic.pageImages];
        newImages[pageIndex] = null;
        return { ...topic, pageImages: newImages };
      }
      return topic;
    }));
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-area');
    const opt = {
      margin: 0,
      filename: `Konspekt_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleRefineTopic = async (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic || !topic.content || isRefining) return;

    setIsRefining(true);
    try {
      const fullContent = topic.content.join('\n\n');
      const refinedText = await refineKonspek(fullContent);
      
      // Split refined text back into pages
      const refinedPages = refinedText.split('---PAGE_BREAK---').map(p => p.trim());
      
      // Ensure we have the right number of pages
      const finalPages = Array(topic.pages).fill('').map((_, i) => refinedPages[i] || '');
      
      updateTopic(topicId, 'content', finalPages);
    } catch (error) {
      console.error("Refinement Error:", error);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-blue-100 transition-colors duration-300",
      isDarkMode ? "dark bg-[#0f1115] text-white" : "bg-[#f8fafc] text-neutral-900"
    )}>
      <AnimatePresence>
        {/* Dark Mode Toggle - Global */}
        <div className="fixed top-6 right-6 z-[300]">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="glass-button p-3 flex items-center justify-center"
            title={isDarkMode ? "Kunduzgi rejim" : "Tungi rejim"}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
        </div>

        {currentStep === 'landing' && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 text-center transition-colors duration-300",
              isDarkMode ? "bg-[#0f1115]" : "bg-white"
            )}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-2xl space-y-8"
            >
              <div className="flex justify-center">
                <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-2xl shadow-blue-200">
                  <Book size={48} />
                </div>
              </div>
              <div className="space-y-4">
                <h1 className={cn("text-5xl font-black tracking-tight", isDarkMode ? "text-white" : "text-neutral-900")}>Konspek AI</h1>
                <p className={cn("text-xl leading-relaxed", isDarkMode ? "text-neutral-400" : "text-neutral-600")}>
                  Talabalar va o'quvchilar uchun eng mukammal yordamchi. 
                  Matnlarni bir zumda chiroyli va realistik qo'lyozma ko'rinishiga keltiring.
                </p>
              </div>
              <button 
                onClick={() => setCurrentStep('mode-selection')}
                className="glass-button-primary px-12 py-4 text-lg font-bold shadow-2xl"
              >
                Boshlash
              </button>
            </motion.div>
          </motion.div>
        )}

        {currentStep === 'mode-selection' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[190] flex flex-col items-center justify-center p-6 transition-colors duration-300",
              isDarkMode ? "bg-[#0f1115]" : "bg-[#f8fafc]"
            )}
          >
            <div className="max-w-4xl w-full space-y-12">
              <div className="text-center space-y-4">
                <h2 className={cn("text-3xl font-black", isDarkMode ? "text-white" : "text-neutral-900")}>Ish uslubini tanlang</h2>
                <p className={cn(isDarkMode ? "text-neutral-400" : "text-neutral-500")}>Konspekt yaratish uchun o'zingizga qulay usulni tanlang</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { 
                    id: 'realistic', 
                    icon: <PenTool size={32} />, 
                    title: "Realistik", 
                    desc: "Matn kiritish orqali konspekt yaratish",
                    color: isDarkMode ? "bg-blue-900/20 text-blue-400 border-blue-800/50" : "bg-blue-50 text-blue-600 border-blue-100"
                  },
                  { 
                    id: 'voice', 
                    icon: <Mic size={32} />, 
                    title: "Ovozli", 
                    desc: "Ma'ruzani tinglash va yozib borish",
                    color: isDarkMode ? "bg-purple-900/20 text-purple-400 border-purple-800/50" : "bg-purple-50 text-purple-600 border-purple-100"
                  },
                  { 
                    id: 'documents', 
                    icon: <FileUp size={32} />, 
                    title: "Hujjatlar", 
                    desc: "PDF, DOCX va boshqa fayllardan konspekt",
                    color: isDarkMode ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/50" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  }
                ].map((mode) => (
                  <motion.button
                    key={mode.id}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedMode(mode.id as any);
                      if (mode.id === 'realistic') setCurrentStep('config');
                      else if (mode.id === 'voice') setCurrentStep('voice');
                      else if (mode.id === 'documents') setCurrentStep('documents');
                    }}
                    className={cn(
                      "p-8 rounded-[2rem] border-2 flex flex-col items-center text-center space-y-6 transition-all",
                      isDarkMode 
                        ? "bg-[#14161c] border-white/5 shadow-2xl shadow-black/50 hover:border-blue-500/30 hover:shadow-blue-900/20" 
                        : "bg-white shadow-xl shadow-neutral-200/50 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100"
                    )}
                  >
                    <div className={cn("p-6 rounded-2xl", mode.color)}>
                      {mode.icon}
                    </div>
                    <div className="space-y-2">
                      <h3 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-neutral-900")}>{mode.title}</h3>
                      <p className={cn("text-sm leading-relaxed", isDarkMode ? "text-neutral-400" : "text-neutral-500")}>{mode.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={() => setCurrentStep('landing')}
                  className="text-neutral-400 hover:text-neutral-600 text-sm font-medium flex items-center gap-2"
                >
                  <ChevronLeft size={16} />
                  Orqaga qaytish
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={cn("no-print sticky top-0 z-50 glass-nav px-6 py-4 flex items-center justify-between", isDarkMode ? "border-b border-white/10" : "")}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
            <Book size={24} />
          </div>
          <h1 className={cn("text-xl font-bold tracking-tight", isDarkMode ? "text-white" : "text-neutral-900")}>Konspek AI</h1>
        </div>
        
        <div className="flex items-center gap-4 pr-12">
          {currentStep === 'preview' && (
            <>
              <button 
                onClick={() => setCurrentStep('config')}
                className={cn("glass-button px-4 py-2 text-sm font-medium flex items-center gap-1", isDarkMode ? "text-neutral-300" : "text-neutral-600")}
              >
                <ChevronLeft size={16} />
                Orqaga
              </button>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "glass-button px-4 py-2 text-sm font-medium flex items-center gap-1 transition-all", 
                  isEditing 
                    ? "bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20" 
                    : (isDarkMode ? "text-neutral-300" : "text-neutral-600")
                )}
              >
                <Edit2 size={16} />
                {isEditing ? "Saqlash" : "Tahrirlash"}
              </button>
            </>
          )}
          <div className={cn("h-6 w-px", isDarkMode ? "bg-white/20" : "bg-neutral-200/50")} />
          <p className={cn("text-sm font-medium hidden sm:block", isDarkMode ? "text-neutral-400" : "text-neutral-500")}>
            {new Date().toLocaleDateString('uz-UZ')}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {currentStep === 'saved' && (
            <motion.div 
              key="saved"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <h2 className="text-2xl font-bold">Saqlangan konspektlar</h2>
              <p>Hozircha saqlangan konspektlar yo'q.</p>
              <button 
                onClick={() => setCurrentStep('config')}
                className="glass-button px-4 py-2"
              >
                Orqaga
              </button>
            </motion.div>
          )}
          {currentStep === 'config' && (
            <motion.div 
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Notebook Settings */}
              <section className="glass-card p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className={cn("flex items-center gap-2", isDarkMode ? "text-neutral-400" : "text-neutral-500")}>
                    <Settings size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Daftar Sozlamalari</h2>
                  </div>
                  <button 
                    onClick={() => setCurrentStep('mode-selection')}
                    className={cn("text-xs font-bold hover:underline", isDarkMode ? "text-blue-400" : "text-blue-600")}
                  >
                    Uslubni o'zgartirish
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className={cn("text-sm font-bold", isDarkMode ? "text-neutral-300" : "text-neutral-700")}>Daftar uslubi</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['katakli', 'chiziqli', 'panjarali'].map((style) => (
                        <button
                          key={style}
                          onClick={() => setNotebookStyle(style as any)}
                          className={cn(
                            "py-4 px-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-center",
                            notebookStyle === style 
                              ? (isDarkMode ? "border-blue-500 bg-blue-900/30 text-blue-400 shadow-inner" : "border-blue-500 bg-blue-50/50 text-blue-700 shadow-inner")
                              : (isDarkMode ? "border-transparent bg-white/5 text-neutral-400 hover:bg-white/10" : "border-transparent bg-white/50 text-neutral-500 hover:bg-white")
                          )}
                        >
                          <NotebookStyleIcon type={style} active={notebookStyle === style} isDarkMode={isDarkMode} />
                          <span className="text-xs font-bold uppercase tracking-widest opacity-80">{style}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className={cn("text-sm font-bold", isDarkMode ? "text-neutral-300" : "text-neutral-700")}>Daftar turi</label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {['12', '24', '36', '48', '72', '96', 'A4'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setNotebookType(type as any)}
                          className={cn(
                            "py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-0.5",
                            notebookType === type 
                              ? (isDarkMode ? "border-blue-500 bg-blue-900/30 text-blue-400 shadow-inner" : "border-blue-500 bg-blue-50/50 text-blue-700 shadow-inner")
                              : (isDarkMode ? "border-transparent bg-white/5 text-neutral-400 hover:bg-white/10" : "border-transparent bg-white/50 text-neutral-500 hover:bg-white")
                          )}
                        >
                          <span className="text-sm font-black">{type === 'A4' ? 'A4' : type}</span>
                          <span className="text-[8px] uppercase tracking-tighter opacity-60 font-bold leading-none">{type === 'A4' ? 'Format' : 'Varaq'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className={cn("text-sm font-bold", isDarkMode ? "text-neutral-300" : "text-neutral-700")}>Yozuv uslubi (Shablon)</label>
                    <div className="grid grid-cols-1 gap-3">
                      <select 
                        value={selectedFont.name}
                        onChange={(e) => setSelectedFont(FONTS.find(f => f.name === e.target.value) || FONTS[0])}
                        className={cn("glass-input w-full p-4 font-medium outline-none", isDarkMode ? "text-white bg-black/40" : "")}
                      >
                        {FONTS.map(font => (
                          <option key={font.name} value={font.name} className={isDarkMode ? "bg-neutral-900" : ""}>{font.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleStyleImageUpload} 
                          className="hidden" 
                          ref={fileInputRef}
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className={cn("glass-button p-4 flex items-center gap-2", isDarkMode ? "text-neutral-300" : "text-neutral-600")}
                        >
                          <ImageIcon size={20} />
                          Uslubni rasmdan aniqlash
                        </button>
                      </div>
                      <div className={cn("glass-card p-4 flex items-center justify-center text-2xl min-h-[80px] text-center", selectedFont.class)} style={{ fontSize: `${fontSize}px`, color: fontColor }}>
                        {selectedFont.sample}
                      </div>

                      <div className="space-y-4 mt-4">
                        <label className={cn("text-sm font-bold", isDarkMode ? "text-neutral-300" : "text-neutral-700")}>Shablonlar</label>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Shablon nomi" 
                              className={cn("glass-input flex-1 p-2", isDarkMode ? "text-white bg-black/40" : "")}
                              id="new-template-name"
                            />
                            <button 
                              onClick={() => {
                                const name = (document.getElementById('new-template-name') as HTMLInputElement).value;
                                if (name) {
                                  setTemplates([...templates, { name, selectedFont, fontSize, fontColor, notebookType, notebookStyle }]);
                                  (document.getElementById('new-template-name') as HTMLInputElement).value = '';
                                }
                              }}
                              className="glass-button p-2"
                            >
                              Saqlash
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {templates.map((t, i) => (
                              <button 
                                key={i}
                                onClick={() => {
                                  setSelectedFont(t.selectedFont);
                                  setFontSize(t.fontSize);
                                  setFontColor(t.fontColor);
                                  setNotebookType(t.notebookType);
                                  setNotebookStyle(t.notebookStyle);
                                }}
                                className="glass-button p-2 text-xs"
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-neutral-400" : "text-neutral-500")}>Shrift hajmi</label>
                          <span className={cn("text-xs font-black", isDarkMode ? "text-blue-400" : "text-blue-600")}>{fontSize}px</span>
                        </div>
                        <input 
                          type="range" 
                          min="16" 
                          max="48" 
                          step="1"
                          value={fontSize}
                          onChange={(e) => setFontSize(parseInt(e.target.value))}
                          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-neutral-400" : "text-neutral-500")}>Siyoh rangi</label>
                        <div className="flex gap-3">
                          {[
                            { name: 'Ko\'k', color: '#1e3a8a' },
                            { name: 'Qora', color: '#171717' },
                            { name: 'Qizil', color: '#dc2626' },
                            { name: 'Yashil', color: '#16a34a' }
                          ].map((c) => (
                            <button
                              key={c.color}
                              onClick={() => setFontColor(c.color)}
                              title={c.name}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 transition-all",
                                fontColor === c.color ? "border-blue-500 scale-110 shadow-md" : "border-transparent hover:scale-105"
                              )}
                              style={{ backgroundColor: c.color }}
                            />
                          ))}
                          <div className="relative group">
                            <input 
                              type="color" 
                              value={fontColor}
                              onChange={(e) => setFontColor(e.target.value)}
                              className="w-8 h-8 rounded-full border-2 border-transparent cursor-pointer opacity-0 absolute inset-0 z-10"
                            />
                            <div 
                              className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center group-hover:bg-neutral-50", isDarkMode ? "border-neutral-700 bg-neutral-800" : "border-neutral-200 bg-white")}
                              style={{ borderColor: fontColor === '#ffffff' ? '#e5e5e5' : 'transparent' }}
                            >
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: fontColor }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Topics Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className={cn("flex items-center gap-2", isDarkMode ? "text-neutral-400" : "text-neutral-500")}>
                    <FileText size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Mavzular</h2>
                  </div>
                  <button 
                    onClick={addTopic}
                    className="glass-button-primary px-6 py-2.5 text-sm font-bold flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Mavzu qo'shish
                  </button>
                </div>

                <div className="space-y-6">
                  {topics.map((topic, index) => (
                    <motion.div 
                      layout
                      key={topic.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-end relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/20" />
                      
                      <div className={cn("md:col-span-1 font-black text-2xl mb-auto pt-2", isDarkMode ? "text-neutral-600" : "text-neutral-300")}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      
                      <div className="md:col-span-3 space-y-2">
                        <label className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>Mavzu nomi</label>
                        <div className="relative">
                          <input 
                            type="text"
                            value={topic.title}
                            onChange={(e) => updateTopic(topic.id, 'title', e.target.value)}
                            placeholder="Mavzuni kiriting..."
                            className={cn("glass-input w-full pl-5 pr-12 py-3.5 font-medium outline-none", isDarkMode ? "text-white placeholder-neutral-500" : "")}
                          />
                          <button 
                            onClick={() => startListening(index)}
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
                              isListening && activeTopicIndex === index ? "text-red-500 bg-red-50 animate-pulse scale-110" : (isDarkMode ? "text-neutral-400 hover:bg-white/10" : "text-neutral-400 hover:bg-neutral-100")
                            )}
                          >
                            <Mic size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>Varaqlar soni</label>
                        <input 
                          type="number"
                          min="1"
                          max="20"
                          value={topic.pages}
                          onChange={(e) => updateTopic(topic.id, 'pages', parseInt(e.target.value) || 1)}
                          className={cn("glass-input w-full px-4 py-3.5 font-medium outline-none", isDarkMode ? "text-white" : "")}
                        />
                      </div>

                      <div className="md:col-span-3 space-y-2">
                        <label className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>Sana</label>
                        <div className="relative">
                          <input 
                            type="date"
                            value={topic.date}
                            onChange={(e) => updateTopic(topic.id, 'date', e.target.value)}
                            className={cn("glass-input w-full pl-12 pr-5 py-3.5 font-medium outline-none", isDarkMode ? "text-white" : "")}
                          />
                          <CalendarIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        </div>
                      </div>

                      <div className="md:col-span-3 space-y-2">
                        <label className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>Ta'lim yo'nalishi</label>
                        <input 
                          type="text"
                          value={topic.educationField || ''}
                          onChange={(e) => updateTopic(topic.id, 'educationField', e.target.value)}
                          placeholder="Yo'nalish..."
                          className={cn("glass-input w-full px-4 py-3.5 font-medium outline-none", isDarkMode ? "text-white placeholder-neutral-500" : "")}
                        />
                      </div>

                      <div className="md:col-span-4 space-y-2">
                        <label className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>Fan nomi</label>
                        <input 
                          type="text"
                          value={topic.subjectName || ''}
                          onChange={(e) => updateTopic(topic.id, 'subjectName', e.target.value)}
                          placeholder="Fan nomi..."
                          className={cn("glass-input w-full px-4 py-3.5 font-medium outline-none", isDarkMode ? "text-white placeholder-neutral-500" : "")}
                        />
                      </div>

                      <div className="md:col-span-3 space-y-2">
                        <label className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>Hujjat</label>
                        <div className="relative">
                          <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => handleFileUpload(index, e)}
                            className="hidden"
                            accept=".txt,.pdf"
                          />
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            title="Hujjat yuklash (PDF, TXT)"
                            className={cn(
                              "glass-button w-full py-3.5 px-4 flex items-center justify-center gap-2 text-xs font-bold",
                              topic.fileName && !isOCRing ? (isDarkMode ? "text-blue-400 border-blue-500/30 bg-blue-900/20" : "text-blue-600 border-blue-200 bg-blue-50") : (isDarkMode ? "text-neutral-400" : "text-neutral-500")
                            )}
                          >
                            <FileUp size={16} />
                            {topic.fileName && !isOCRing ? (topic.fileName.length > 12 ? topic.fileName.substring(0, 12) + '...' : topic.fileName) : "Hujjat yuklash"}
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-3 space-y-2">
                        <label className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>Rasm (OCR)</label>
                        <div className="relative">
                          <input 
                            type="file"
                            ref={ocrInputRef}
                            onChange={(e) => handleOCRUpload(index, e)}
                            className="hidden"
                            accept="image/*"
                          />
                          <button 
                            onClick={() => ocrInputRef.current?.click()}
                            disabled={isOCRing}
                            title="Rasmdan matnni aniqlash"
                            className={cn(
                              "glass-button w-full py-3.5 px-4 flex items-center justify-center gap-2 text-xs font-bold",
                              isOCRing ? "opacity-50" : (isDarkMode ? "text-neutral-400" : "text-neutral-500")
                            )}
                          >
                            {isOCRing ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                            {isOCRing ? "Aniqlanmoqda..." : "Rasmdan matn"}
                          </button>
                          {topic.fileName && (
                            <button 
                              onClick={() => {
                                updateTopic(topic.id, 'fileContent', undefined);
                                updateTopic(topic.id, 'fileName', undefined);
                              }}
                              className={cn("absolute -top-2 -right-2 border rounded-full p-1 text-red-500 shadow-md hover:scale-110 transition-transform", isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200")}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-1 flex justify-end">
                        <button 
                          onClick={() => removeTopic(topic.id)}
                          className={cn("p-3 hover:text-red-500 rounded-2xl transition-all", isDarkMode ? "text-neutral-600 hover:bg-red-900/20" : "text-neutral-300 hover:bg-red-50")}
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>

                      <div className="md:col-span-12 space-y-2 mt-2">
                        <label className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>Reja (ixtiyoriy)</label>
                        <textarea 
                          value={topic.plan || ''}
                          onChange={(e) => updateTopic(topic.id, 'plan', e.target.value)}
                          placeholder="Rejani kiriting (har bir qator yangi band)..."
                          className={cn("glass-input w-full px-5 py-3.5 font-medium outline-none resize-none min-h-[80px]", isDarkMode ? "text-white placeholder-neutral-500" : "")}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              <div className="pt-10">
                <button 
                  onClick={triggerGenerate}
                  disabled={isGenerating || (topics.every(t => !t.title && !t.fileContent))}
                  className="glass-button-primary w-full py-5 text-xl font-black flex items-center justify-center gap-4 shadow-2xl disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Konspekt tayyorlanmoqda...
                    </>
                  ) : (
                    <>
                      <PenTool size={26} />
                      Konspektni yozishni boshlash
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'voice' && (
            <motion.div 
              key="voice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8 py-10"
            >
              <div className="text-center space-y-4">
                <div className={cn("inline-flex p-4 rounded-3xl mb-4", isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600")}>
                  <Mic size={48} />
                </div>
                <h2 className={cn("text-3xl font-black", isDarkMode ? "text-white" : "")}>Ovozli konspekt</h2>
                <p className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Ma'ruzani diktofonga yozing, biz uni konspektga aylantiramiz.</p>
              </div>

              <div className="glass-card p-8 space-y-6 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
                {isDictating && (
                  <div className="absolute inset-0 bg-blue-500/5 flex items-center justify-center">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <motion.div
                          key={i}
                          animate={{ height: [10, 40, 10] }}
                          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                          className="w-1 bg-blue-500 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative z-10 text-center space-y-6 w-full">
                  <textarea 
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    placeholder="Gapirishni boshlang yoki matnni tahrirlang..."
                    className={cn("glass-input w-full p-6 min-h-[200px] text-left font-medium italic resize-none outline-none", isDarkMode ? "text-neutral-300 placeholder-neutral-600" : "text-neutral-700")}
                  />

                  <div className="flex flex-col items-center gap-4">
                    <button 
                      onClick={isDictating ? () => recognitionRef.current?.stop() : startVoiceMode}
                      className={cn(
                        "w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl",
                        isDictating ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white hover:scale-105"
                      )}
                    >
                      {isDictating ? <MicOff size={32} /> : <Mic size={32} />}
                    </button>
                    {isDictating && (
                      <div className={cn("text-2xl font-mono font-bold px-4 py-1 rounded-full shadow-sm", isDarkMode ? "text-blue-400 bg-black/40" : "text-blue-600 bg-white/80")}>
                        {formatTime(recordingTime)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentStep('mode-selection')}
                  className="glass-button flex-1 py-4 font-bold"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={async () => {
                    setIsGenerating(true);
                    const prompt = `Ushbu matnni konspekt qilib ber: ${voiceText}`;
                    const response = await ai.models.generateContent({
                      model: "gemini-3-flash-preview",
                      contents: prompt,
                    });
                    const content = response.text || '';
                    setTopics([{
                      id: '1',
                      title: 'Ovozli ma\'ruza',
                      date: new Date().toISOString().split('T')[0],
                      pages: 1,
                      plan: '',
                      content: [content]
                    }]);
                    setAnimatedPages({});
                    setIsAnimating(true);
                    setIsGenerating(false);
                    setCurrentStep('preview');
                  }}
                  disabled={!voiceText || isGenerating}
                  className="glass-button-primary flex-1 py-4 font-bold flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                  Konspektga aylantirish
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'documents' && (
            <motion.div 
              key="documents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8 py-10"
            >
              <div className="text-center space-y-4">
                <div className={cn("inline-flex p-4 rounded-3xl mb-4", isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600")}>
                  <FileUp size={48} />
                </div>
                <h2 className={cn("text-3xl font-black", isDarkMode ? "text-white" : "")}>Hujjatlardan konspekt</h2>
                <p className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>PDF, DOCX yoki boshqa hujjatlarni yuklang.</p>
              </div>

              <div className="glass-card p-10 space-y-8">
                {!docFile ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn("border-2 border-dashed rounded-3xl p-12 text-center space-y-4 transition-all cursor-pointer group", isDarkMode ? "border-neutral-700 hover:border-blue-500 hover:bg-blue-900/10" : "border-neutral-200 hover:border-blue-400 hover:bg-blue-50/30")}
                  >
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all", isDarkMode ? "bg-neutral-800 group-hover:bg-blue-900/30 group-hover:text-blue-400" : "bg-neutral-50 group-hover:bg-blue-100 group-hover:text-blue-600")}>
                      <FileUp size={32} />
                    </div>
                    <div>
                      <p className={cn("font-bold text-lg", isDarkMode ? "text-neutral-300" : "")}>Faylni tanlang yoki shu yerga tashlang</p>
                      <p className={cn("text-sm", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>PDF, DOCX, PPTX, TXT (Max 20MB)</p>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleDocUpload(file);
                        }
                      }}
                      className="hidden" 
                      accept=".pdf,.docx,.pptx,.txt"
                    />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className={cn("flex items-center justify-between p-4 rounded-2xl border", isDarkMode ? "bg-blue-900/20 border-blue-500/30" : "bg-blue-50 border-blue-100")}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-xl">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className={cn("font-bold text-sm truncate max-w-[200px]", isDarkMode ? "text-neutral-200" : "")}>{docFile.name}</p>
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-blue-400" : "text-blue-600")}>Yuklandi</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setDocFile(null)}
                        className={cn("p-2 transition-all", isDarkMode ? "text-neutral-500 hover:text-red-400" : "text-neutral-400 hover:text-red-500")}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <label className={cn("text-sm font-bold", isDarkMode ? "text-neutral-300" : "text-neutral-700")}>Qanday usulda yozamiz?</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setDocMode('topic')}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all text-left space-y-1",
                            docMode === 'topic' ? (isDarkMode ? "border-blue-500 bg-blue-900/30 text-blue-400" : "border-blue-500 bg-blue-50 text-blue-700") : (isDarkMode ? "border-transparent bg-white/5 text-neutral-400 hover:bg-white/10" : "border-transparent bg-neutral-50 hover:bg-neutral-100 text-neutral-700")
                          )}
                        >
                          <p className="font-bold">Mavzu asosida</p>
                          <p className={cn("text-[10px]", isDarkMode ? "text-neutral-500" : "text-neutral-500")}>Faqat kerakli mavzuni qidirib topadi</p>
                        </button>
                        <button 
                          onClick={() => setDocMode('pages')}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all text-left space-y-1",
                            docMode === 'pages' ? (isDarkMode ? "border-blue-500 bg-blue-900/30 text-blue-400" : "border-blue-500 bg-blue-50 text-blue-700") : (isDarkMode ? "border-transparent bg-white/5 text-neutral-400 hover:bg-white/10" : "border-transparent bg-neutral-50 hover:bg-neutral-100 text-neutral-700")
                          )}
                        >
                          <p className="font-bold">Betlar asosida</p>
                          <p className={cn("text-[10px]", isDarkMode ? "text-neutral-500" : "text-neutral-500")}>Siz tanlagan betlarni konspekt qiladi</p>
                        </button>
                      </div>
                    </div>

                    {docMode === 'topic' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-500")}>Mavzu nomi</label>
                        <input 
                          type="text"
                          value={docTopic}
                          onChange={(e) => setDocTopic(e.target.value)}
                          placeholder="Mavzuni kiriting..."
                          className={cn("glass-input w-full p-4 font-bold outline-none", isDarkMode ? "text-white placeholder-neutral-600" : "")}
                        />
                      </motion.div>
                    )}

                    {docMode === 'pages' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="space-y-2">
                          <label className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-500")}>Dan</label>
                          <input 
                            type="number"
                            value={pageRange.start}
                            onChange={(e) => setPageRange({ ...pageRange, start: parseInt(e.target.value) || 1 })}
                            className={cn("glass-input w-full p-4 font-bold outline-none text-center", isDarkMode ? "text-white" : "")}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-500")}>Gacha</label>
                          <input 
                            type="number"
                            value={pageRange.end}
                            onChange={(e) => setPageRange({ ...pageRange, end: parseInt(e.target.value) || 1 })}
                            className={cn("glass-input w-full p-4 font-bold outline-none text-center", isDarkMode ? "text-white" : "")}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentStep('mode-selection')}
                  className="glass-button flex-1 py-4 font-bold"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={async () => {
                    setIsGenerating(true);
                    try {
                      const topicTitle = docMode === 'topic' ? docTopic : `Hujjat (${pageRange.start}-${pageRange.end} betlar)`;
                      const content = await generateKonspek(
                        topicTitle,
                        1,
                        new Date().toISOString().split('T')[0],
                        'full',
                        docFile?.content || '',
                        undefined,
                        docMode as 'topic' | 'pages',
                        docTopic,
                        pageRange,
                        undefined
                      );
                      
                      const pages = content.split('---PAGE_BREAK---').map(p => p.trim()).filter(p => p.length > 0);
                      setTopics([{
                        id: '1',
                        title: topicTitle,
                        date: new Date().toISOString().split('T')[0],
                        pages: pages.length,
                        plan: '',
                        content: pages
                      }]);
                      setAnimatedPages({});
                      setIsAnimating(true);
                      setCurrentStep('preview');
                    } catch (error) {
                      console.error("Doc Generation Error:", error);
                      alert("Konspekt yaratishda xatolik yuz berdi.");
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                  disabled={!docFile || !docMode || (docMode === 'topic' && !docTopic) || isGenerating}
                  className="glass-button-primary flex-1 py-4 font-bold flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                  Konspektni yaratish
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'preview' && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className={cn("no-print flex flex-col sm:flex-row items-center justify-between glass-card p-6 gap-4", isDarkMode ? "bg-neutral-900/50" : "")}>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => setCurrentStep('config')}
                    className={cn("glass-button p-3", isDarkMode ? "text-neutral-400 hover:text-white" : "text-neutral-600")}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <h2 className={cn("text-xl font-black", isDarkMode ? "text-white" : "")}>Tayyor Konspekt</h2>
                    <p className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>
                      {topics.length} ta mavzu • {topics.reduce((acc, t) => acc + t.pages, 0)} bet 
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      // Refine all topics that have content
                      topics.forEach(t => {
                        if (t.content) handleRefineTopic(t.id);
                      });
                    }}
                    disabled={isRefining}
                    className={cn("glass-button flex-1 sm:flex-none px-6 py-3.5 font-bold flex items-center justify-center gap-2", isDarkMode ? "text-blue-400 border-blue-500/30 bg-blue-900/20 hover:bg-blue-900/40" : "text-blue-600 border-blue-200/50")}
                  >
                    {isRefining ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Sparkles size={20} />
                    )}
                    Takomillashtirish
                  </button>
                  <button 
                    onClick={() => {
                      setIsAnimating(false);
                      handleDownloadPDF();
                    }}
                    className={cn("glass-button flex-1 sm:flex-none px-8 py-3.5 font-bold flex items-center justify-center gap-2", isDarkMode ? "text-neutral-300 hover:text-white" : "")}
                  >
                    <Download size={20} />
                    PDF
                  </button>
                  <button 
                    onClick={() => {
                      setAnimatedPages({});
                      setIsAnimating(true);
                    }}
                    className={cn("glass-button px-6 py-3.5 font-bold flex items-center justify-center gap-2", isDarkMode ? "text-neutral-400 hover:text-white" : "text-neutral-600")}
                    title="Qayta yozish"
                  >
                    <History size={20} />
                  </button>
                  {isAnimating && (
                    <button 
                      onClick={() => setIsAnimating(false)}
                      className={cn("glass-button px-6 py-3.5 font-bold flex items-center justify-center gap-2", isDarkMode ? "text-red-400 hover:text-red-300" : "text-red-500")}
                      title="To'xtatish"
                    >
                      <X size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsAnimating(false);
                      handlePrint();
                    }}
                    className="glass-button-primary flex-1 sm:flex-none px-8 py-3.5 font-bold flex items-center justify-center gap-2 shadow-xl"
                  >
                    <Printer size={20} />
                    Chop etish / PDF
                  </button>
                </div>
              </div>

              <div id="printable-area" className="space-y-12 pb-20">
                {(() => {
                  let globalPageCount = 0;
                  return topics.map((topic, tIdx) => (
                    <div key={topic.id} className="space-y-12">
                      {topic.content?.map((pageContent, pIdx) => {
                        const isEvenPage = globalPageCount % 2 === 1;
                        const marginClass = isEvenPage ? 'margin-left' : 'margin-right';
                        globalPageCount++;
                        const pageImage = topic.pageImages?.[pIdx];
                        
                        return (
                          <div key={`${topic.id}-${pIdx}`} className="notebook-page-container relative group">
                            <div className="no-print absolute -left-16 top-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className={cn("glass-card p-2.5", isDarkMode ? "text-neutral-500" : "text-neutral-400")}>
                                <PenTool size={18} />
                              </div>
                              <button 
                                onClick={() => startDictation(topic.id, pIdx)}
                                className={cn(
                                  "glass-button p-2.5 transition-all",
                                  isDictating && activeDictation?.topicId === topic.id && activeDictation?.pageIndex === pIdx
                                    ? (isDarkMode ? "bg-red-900/30 border-red-500/30 text-red-400 animate-pulse" : "bg-red-50 border-red-200 text-red-500 animate-pulse")
                                    : (isDarkMode ? "text-neutral-500 hover:text-blue-400" : "text-neutral-400 hover:text-blue-500")
                                )}
                              >
                                <Mic size={18} />
                              </button>
                              <div className="relative">
                                <input 
                                  type="file"
                                  id={`page-image-${topic.id}-${pIdx}`}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handlePageImageUpload(topic.id, pIdx, e)}
                                />
                                <label 
                                  htmlFor={`page-image-${topic.id}-${pIdx}`}
                                  className={cn("glass-button p-2.5 cursor-pointer flex items-center justify-center", isDarkMode ? "text-neutral-500 hover:text-blue-400" : "text-neutral-400 hover:text-blue-500")}
                                >
                                  <Upload size={18} />
                                </label>
                              </div>
                              {pageImage && (
                                <button 
                                  onClick={() => removePageImage(topic.id, pIdx)}
                                  className={cn("glass-button p-2.5", isDarkMode ? "text-red-500 hover:text-red-400" : "text-red-400 hover:text-red-600")}
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                            <div 
                              className={cn("notebook-page outline-none shadow-2xl", notebookStyle, selectedFont.class, marginClass)} 
                              style={{ 
                                color: fontColor,
                                backgroundSize: notebookStyle === 'chiziqli' ? `100% ${fontSize * 1.5}px` : '2rem 2rem'
                              }}
                            >
                              <div className="flex flex-col mb-6 border-b-2 border-neutral-100 pb-3 gap-3">
                                <div className="w-full text-right">
                                  <p 
                                    contentEditable={isEditing}
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateTopic(topic.id, 'date', e.currentTarget.textContent || '')}
                                    className={cn("text-base font-bold opacity-80 outline-none inline-block transition-all", isEditing ? "bg-blue-50/50 px-2 rounded border border-blue-200/50" : "")}
                                    style={{ fontSize: `${fontSize - 4}px` }}
                                  >
                                    {topic.date.split('-').reverse().join('.')}
                                  </p>
                                </div>
                                <div className="w-full text-center">
                                  <h3 
                                    contentEditable={isEditing}
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateTopic(topic.id, 'title', e.currentTarget.textContent || '')}
                                    className={cn("text-2xl font-bold underline decoration-blue-200 underline-offset-8 outline-none inline-block transition-all", isEditing ? "bg-blue-50/50 px-4 rounded border border-blue-200/50" : "")}
                                    style={{ fontSize: `${fontSize + 4}px` }}
                                  >
                                    {topic.title || (topic.fileName ? `Hujjat: ${topic.fileName}` : "Nomsiz mavzu")}
                                  </h3>
                                </div>
                                {pIdx === 0 && topic.plan && (
                                  <div className="w-full text-left mt-2 pl-4">
                                    <p className="font-bold underline decoration-blue-200 underline-offset-4 mb-2" style={{ fontSize: `${fontSize}px` }}>Reja:</p>
                                    <div 
                                      contentEditable={isEditing}
                                      suppressContentEditableWarning
                                      onBlur={(e) => updateTopic(topic.id, 'plan', e.currentTarget.innerText || '')}
                                      className={cn("font-medium outline-none whitespace-pre-wrap transition-all", isEditing ? "bg-blue-50/50 p-2 rounded border border-blue-200/50" : "")}
                                      style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.5}px` }}
                                    >
                                      {topic.plan}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 flex flex-col gap-4">
                                {pageImage && (
                                  <div className="relative w-full max-h-[300px] mb-4 overflow-hidden rounded-lg border border-neutral-100">
                                    <img 
                                      src={pageImage} 
                                      alt="Page content" 
                                      className="w-full h-full object-contain mix-blend-multiply opacity-90"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                                <div 
                                  contentEditable={isEditing && (!isAnimating || animatedPages[`${topic.id}-${pIdx}`])}
                                  suppressContentEditableWarning
                                  onBlur={(e) => updatePageContent(topic.id, pIdx, e.currentTarget.innerText)}
                                  className={cn("whitespace-pre-wrap leading-[2.5rem] outline-none flex-1 handwriting-enhanced transition-all", isEditing ? "bg-blue-50/30 p-2 rounded border border-blue-200/30" : "")}
                                  style={{ 
                                    fontSize: `${fontSize}px`, 
                                    lineHeight: `${fontSize * 1.5}px`,
                                    textShadow: `0.2px 0.2px 0.5px ${fontColor}40` // ~25% opacity
                                  }}
                                >
                                  {!animatedPages[`${topic.id}-${pIdx}`] && isAnimating ? (
                                    <WritingAnimation 
                                      text={pageContent} 
                                      onComplete={() => setAnimatedPages(prev => ({ ...prev, [`${topic.id}-${pIdx}`]: true }))} 
                                    />
                                  ) : (
                                    pageContent
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mode Selection Modal */}
      <AnimatePresence>
        {showModeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn("rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6", isDarkMode ? "bg-neutral-900" : "bg-white")}
            >
              <div className="text-center space-y-2">
                <h2 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "")}>Yozish rejimini tanlang</h2>
                <p className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Konspekt qanday ko'rinishda bo'lishini xohlaysiz?</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => handleGenerate('full')}
                  className={cn("group p-6 rounded-2xl border-2 transition-all text-left flex items-center gap-4", isDarkMode ? "border-neutral-800 hover:border-blue-500 hover:bg-blue-900/20" : "border-neutral-100 hover:border-blue-600 hover:bg-blue-50")}
                >
                  <div className={cn("p-3 rounded-xl transition-colors", isDarkMode ? "bg-blue-900/50 text-blue-400 group-hover:bg-blue-500 group-hover:text-white" : "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white")}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className={cn("font-bold text-lg", isDarkMode ? "text-neutral-200" : "")}>To'liq yozib berish</h3>
                    <p className={cn("text-sm", isDarkMode ? "text-neutral-500" : "text-neutral-500")}>Barcha ma'lumotlarni batafsil yoritadi.</p>
                  </div>
                </button>

                <button 
                  onClick={() => handleGenerate('summary')}
                  className={cn("group p-6 rounded-2xl border-2 transition-all text-left flex items-center gap-4", isDarkMode ? "border-neutral-800 hover:border-blue-500 hover:bg-blue-900/20" : "border-neutral-100 hover:border-blue-600 hover:bg-blue-50")}
                >
                  <div className={cn("p-3 rounded-xl transition-colors", isDarkMode ? "bg-amber-900/50 text-amber-400 group-hover:bg-amber-600 group-hover:text-white" : "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white")}>
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className={cn("font-bold text-lg", isDarkMode ? "text-neutral-200" : "")}>Asosiy mazmuni</h3>
                    <p className={cn("text-sm", isDarkMode ? "text-neutral-500" : "text-neutral-500")}>Faqat kerakli va muhim joylarini yozadi.</p>
                  </div>
                </button>
              </div>

              <button 
                onClick={() => setShowModeModal(false)}
                className={cn("w-full py-3 font-medium transition-colors", isDarkMode ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-400 hover:text-neutral-600")}
              >
                Bekor qilish
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className={cn("no-print py-12 text-center text-sm border-t mt-20", isDarkMode ? "text-neutral-600 border-neutral-800" : "text-neutral-400 border-neutral-100")}>
        <p>© 2026 Konspek AI. Barcha huquqlar himoyalangan.</p>
        <p className="mt-1">O'zbekiston talabalari uchun maxsus.</p>
      </footer>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .notebook-page {
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
            page-break-after: always;
          }
          .notebook-page-container {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}
