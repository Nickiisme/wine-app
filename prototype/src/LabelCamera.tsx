import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon, CornerBottomLeftIcon, CornerBottomRightIcon, CornerTopLeftIcon, CornerTopRightIcon, Cross1Icon, ImageIcon, ReloadIcon } from "@radix-ui/react-icons";
import "./record-interactions.css";
import { platform } from "./platform/web";
import { requestCamera, attachCamera, stopCamera, captureCamera, cameraErrorMessage } from "./platform/camera";
import type { PhotoFile } from "./platform/photos";

export function LabelCamera({ onCapture, onSystemCamera, onClose, onGallery, onManual }: { onCapture: (file: PhotoFile) => void; onSystemCamera: () => void; onClose: () => void; onGallery: () => void; onManual: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'captured' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [shot, setShot] = useState<{ file: PhotoFile; url: string } | null>(null);
  const shotUrl = useRef<string | null>(null);
  const stop = () => { generation.current++; stopCamera(stream.current, video.current); stream.current = null; };
  useEffect(() => {
    alive.current = true;
    const unsubscribe = platform.onPageHidden(() => { stop(); setStatus('idle'); });
    return () => { alive.current = false; stop(); if (shotUrl.current) platform.revokePreview(shotUrl.current); unsubscribe(); };
  }, []);
  const start = async () => {
    stop();
    const request = generation.current;
    if (shotUrl.current) platform.revokePreview(shotUrl.current);
    shotUrl.current = null; setShot(null); setStatus('starting'); setMessage('');
    try {
      const media = await requestCamera();
      if (!alive.current || request !== generation.current) { stopCamera(media, null); return; }
      stream.current = media;
      if (!video.current) { stop(); return; }
      await attachCamera(video.current, media);
      if (alive.current && request === generation.current) setStatus('live');
    } catch (error) {
      if (!alive.current || request !== generation.current) return;
      stop(); setStatus('error');
      setMessage(cameraErrorMessage(error));
    }
  };
  const capture = async () => {
    const source = video.current;
    if (status !== 'live' || !source) return;
    const request = generation.current;
    setStatus('captured');
    const result = await captureCamera(source);
    if (!alive.current || request !== generation.current) {
      if (result) platform.revokePreview(result.url);
      return;
    }
    if (!result) { setStatus('live'); return; }
    shotUrl.current = result.url; setShot(result); stop();
  };
  const leaveCamera = (action: () => void) => { stop(); setStatus('idle'); action(); };
  const busy = status === 'starting' || (status === 'captured' && !shot);
  const shutterLabel = shot ? '使用照片并识别' : status === 'live' ? '拍摄识别' : status === 'starting' ? '正在打开相机…' : '开启相机';
  return <div className="label-camera-screen">
    <div className="label-camera-stage">
      <video ref={video} muted playsInline aria-label="酒标实时取景" hidden={status !== 'live'} />
      {shot && <img src={shot.url} alt="刚拍摄的酒标" />}
      {!shot && <div className="label-camera-guide" aria-hidden="true"><CornerTopLeftIcon /><CornerTopRightIcon /><CornerBottomLeftIcon /><CornerBottomRightIcon /></div>}
      <p className="label-camera-instruction">{shot ? '确认酒标清晰后，使用照片识别' : '将正面酒标放入框内'}</p>
    </div>
    <header className="label-camera-toolbar"><button type="button" aria-label="关闭拍摄酒标" onClick={() => leaveCamera(onClose)}><Cross1Icon /></button><h2>拍摄酒标</h2></header>
    <div className="label-camera-controls">
      {message && <p className="label-camera-message" role="status">{message}</p>}
      <div className="label-camera-actions">
        <button type="button" className="label-camera-album" onClick={() => leaveCamera(onGallery)}><ImageIcon /><span>相册</span></button>
        <div className="label-camera-shutter-group"><button type="button" className="label-camera-shutter" aria-label={shutterLabel} disabled={busy} aria-busy={busy} onClick={() => { if (shot) onCapture(shot.file); else if (status === 'live') void capture(); else void start(); }}>{shot && <CheckIcon />}</button><span aria-live="polite">{shutterLabel}</span></div>
        <div className="label-camera-secondary">{shot ? <button type="button" onClick={() => void start()}><ReloadIcon /><span>重拍</span></button> : <button type="button" onClick={() => leaveCamera(onSystemCamera)}>系统相机</button>}</div>
      </div>
      <button type="button" className="label-camera-manual" onClick={() => leaveCamera(onManual)}>手动填写<ChevronRightIcon /></button>
    </div>
  </div>;
}
