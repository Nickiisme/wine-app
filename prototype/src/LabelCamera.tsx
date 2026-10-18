import { useEffect, useRef, useState } from "react";
import "./record-interactions.css";
import { platform } from "./platform/web";
import { requestCamera, attachCamera, stopCamera, captureCamera, cameraErrorMessage } from "./platform/camera";
import type { PhotoFile } from "./platform/photos";

export function LabelCamera({ onCapture, onSystemCamera }: { onCapture: (file: PhotoFile) => void; onSystemCamera: () => void }) {
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
