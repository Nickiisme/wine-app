import { useEffect, useRef, useState } from "react";
import "./record-interactions.css";

export function LabelCamera({ onCapture, onSystemCamera }: { onCapture: (file: File) => void; onSystemCamera: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'captured' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const shotUrl = useRef<string | null>(null);
  const stop = () => { generation.current++; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (video.current) video.current.srcObject = null; };
  useEffect(() => {
    alive.current = true;
    const hide = () => { if (document.hidden) { stop(); setStatus('idle'); } };
    document.addEventListener('visibilitychange', hide);
    return () => { alive.current = false; stop(); if (shotUrl.current) URL.revokeObjectURL(shotUrl.current); document.removeEventListener('visibilitychange', hide); };
  }, []);
  const start = async () => {
    stop();
    const request = generation.current;
    if (shotUrl.current) URL.revokeObjectURL(shotUrl.current);
    shotUrl.current = null; setShot(null); setStatus('starting'); setMessage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持内嵌相机，请使用系统相机或相册。');
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } } });
      if (!alive.current || request !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (!video.current) { stop(); return; }
      video.current.srcObject = media;
      await video.current.play();
      if (alive.current && request === generation.current) setStatus('live');
    } catch (error) {
      if (!alive.current || request !== generation.current) return;
      stop(); setStatus('error');
      setMessage(error instanceof DOMException && error.name === 'NotAllowedError' ? '未获得相机权限。可以在浏览器设置中允许，或使用系统相机、相册。' : error instanceof Error ? error.message : '相机暂不可用，请使用系统相机或相册。');
    }
  };
  const capture = () => {
    const source = video.current;
    if (status !== 'live' || !source?.videoWidth || !source.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = source.videoWidth; canvas.height = source.videoHeight;
    canvas.getContext('2d')?.drawImage(source, 0, 0);
    const request = generation.current;
    setStatus('captured');
    canvas.toBlob(blob => {
      if (!alive.current || request !== generation.current) return;
      if (!blob) { setStatus('live'); return; }
      const file = new File([blob], `wine-label-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob); shotUrl.current = url; setShot({ file, url }); stop();
    }, 'image/jpeg', 0.92);
  };
  return <div className="inline-label-camera">
    <div className="label-camera-stage">
      <video ref={video} muted playsInline aria-label="酒标实时取景" hidden={status !== 'live'} />
      {shot ? <img src={shot.url} alt="刚拍摄的酒标" /> : status !== 'live' && <div><strong>将酒标完整放入画面</strong><p>{status === 'starting' ? '请允许相机权限…' : '在弹窗内取景并拍摄酒标'}</p></div>}
    </div>
    {message && <p role="status">{message}</p>}
    {status === 'live' ? <button className="primary-action" onClick={capture}>拍照</button> : shot ? <div className="record-actions"><button onClick={() => void start()}>重拍</button><button onClick={() => onCapture(shot.file)}>使用照片并识别</button></div> : <button className="primary-action" disabled={status === 'starting' || status === 'captured'} onClick={() => void start()}>{status === 'starting' ? '正在打开相机…' : '开启相机'}</button>}
    <button className="text-action" onClick={() => { stop(); setStatus('idle'); onSystemCamera(); }}>使用系统相机</button>
  </div>;
}
