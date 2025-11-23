import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from '@/hooks/use-toast';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const downloadFile = async (
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/plain'
) => {
  if (Capacitor.isNativePlatform()) {
    try {
      let base64Data: string;
      
      if (content instanceof Blob) {
        base64Data = await blobToBase64(content);
      } else {
        base64Data = btoa(unescape(encodeURIComponent(content)));
      }

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      toast({
        title: 'File Downloaded',
        description: `Saved to: ${result.uri}`
      });
    } catch (error) {
      console.error('Mobile download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not save file to device'
      });
    }
  } else {
    const blob = content instanceof Blob 
      ? content 
      : new Blob([content], { type: mimeType });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
