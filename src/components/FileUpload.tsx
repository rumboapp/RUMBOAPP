import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { useNotification } from '../lib/notification-context';

interface FileUploadProps {
  onUpload: (base64: string) => void;
  currentUrl?: string;
  placeholderText?: string;
}

export function FileUpload({ onUpload, currentUrl, placeholderText = "Arrastra una imagen aquí o haz clic para subir" }: FileUploadProps) {
  const { notifyWarning } = useNotification();
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(currentUrl || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notifyWarning('Por favor selecciona una imagen válida.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      onUpload(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
          dragActive 
            ? 'border-emerald-600 bg-emerald-50/20 text-emerald-800' 
            : 'border-gray-200 hover:border-emerald-600/50 text-gray-400 hover:text-gray-600 bg-gray-50/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
        
        {preview ? (
          <div className="relative group w-full flex justify-center items-center">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-h-24 rounded-lg object-contain shadow-xs border border-gray-150" 
            />
            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-white font-bold bg-gray-900/60 px-2 py-1 rounded">Cambiar imagen</span>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-center text-gray-500 font-medium px-2">
              {placeholderText}
            </span>
            <span className="text-[9px] text-gray-400">Archivos JPG, PNG o WebP.</span>
          </>
        )}
      </div>
    </div>
  );
}
