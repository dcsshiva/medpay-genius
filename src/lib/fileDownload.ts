/** Saves text or a Blob as a file through the browser's download. */
export const downloadFile = async (
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/plain'
) => {
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
};
