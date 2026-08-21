import React, { useState, useRef } from 'react';
import { Screen, ExamResult, UserProfile } from '../types';
import { OFFICIAL_LOGO_URL, ADMIN_PHOTO_URL } from '../config/brand';

interface ResultViewProps {
  result: ExamResult;
  userProfile?: UserProfile;
  onNavigate: (screen: Screen) => void;
  onRestartExam: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  userProfile,
  onNavigate,
  onRestartExam,
}) => {
  const [aiTip, setAiTip] = useState<string | null>(result.studyTip);
  const [isLoadingAiTip, setIsLoadingAiTip] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [generatedImagePreview, setGeneratedImagePreview] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const candidateName = userProfile?.name || 'Candidato(a)';
  const scorePercentage = result.percentage || Math.round((result.score / (result.total || 1)) * 100);
  const strokeDashoffset = 552.92 - (552.92 * scorePercentage) / 100;

  const shareUrl = 'https://ngolateste.netlify.app';

  const shareText = `🇦🇴 SIMULADO OFICIAL NGOLATESTE - CONCURSOS PÚBLICOS ANGOLA 🇦🇴

Acabei de concluir um teste de preparação para o Concurso Público na plataforma NgolaTeste!

📊 MEU DESEMPENHO:
🎯 Acertos: ${result.score}/${result.total} (${scorePercentage}%)
⭐ Nota Final: ${result.finalGrade} / 20 Valores
📚 Especialidade: ${result.categoryName || result.testName || 'Concurso Público Geral'}

💡 Desafio dos 100 Likes: Se esta publicação atingir 100 gostos, ganho uma inscrição gratuita no NgolaTeste! Apoiem com o vosso like! 👍🔥

🚀 Treine também para os Concursos Públicos em Angola com testes atualizados:
👉 Acesse agora: https://ngolateste.netlify.app

📞 Dúvidas no WhatsApp: +244 923 361 877 / +244 952 274 756 / +244 956 738 839
#NgolaTeste #ConcursosAngola #Aprovacao #EstudosAngola #Simulados`;

  const handleCopyText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } catch (err) {
      console.warn('Erro ao copiar texto:', err);
    }
  };

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(fbUrl, '_blank', 'width=620,height=580,scrollbars=yes,resizable=yes');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meu Desempenho no NgolaTeste 🇦🇴',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // Fallback to Facebook
        handleShareFacebook();
      }
    } else {
      handleShareFacebook();
    }
  };

  // Helper function to render performance card canvas
  const renderCanvasCard = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350; // 4:5 Mobile Portrait Aspect Ratio
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    try {
      // Load images (Admin photo + Official Supabase Logo)
      const loadImage = (src: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      const [candidateImg, logoImg] = await Promise.all([
        loadImage('/adm_photo.png')
          .then((img) => img || loadImage(ADMIN_PHOTO_URL))
          .then((img) => img || loadImage('/candidate_model.jpg')),
        loadImage('/official_logo.png').then((img) => img || loadImage(OFFICIAL_LOGO_URL)),
      ]);

      // 1. Base Canvas Background (Crisp White on Left, Vibrant Angular Sky/Cyan Blue on Right)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1080, 1350);

      // 2. Right Blue Dynamic Shape & Star Motif
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(560, 0);
      ctx.lineTo(1080, 0);
      ctx.lineTo(1080, 1040);
      ctx.lineTo(470, 1040);
      ctx.closePath();
      const blueGrad = ctx.createLinearGradient(560, 0, 1080, 1040);
      blueGrad.addColorStop(0, '#00AEEF'); // vibrant cyan blue
      blueGrad.addColorStop(1, '#0070D2'); // rich royal blue
      ctx.fillStyle = blueGrad;
      ctx.fill();

      // Subtle Watermark Star in Blue Section (like in flyer)
      ctx.beginPath();
      ctx.arc(880, 180, 160, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.restore();

      // 3. Top Header: Official Company Logo from Supabase / Brand Asset
      ctx.save();
      if (logoImg) {
        const logoAspect = logoImg.width / (logoImg.height || 1);
        const targetHeight = 65;
        const targetWidth = Math.min(270, targetHeight * logoAspect);
        ctx.drawImage(logoImg, 50, 32, targetWidth, targetHeight);
      } else {
        // Fallback Logo badge
        ctx.fillStyle = '#f0f9ff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(50, 32, 60, 60, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0369a1';
        ctx.font = '900 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NT', 80, 70);

        ctx.font = '900 36px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('NGOLA', 125, 74);
        ctx.fillStyle = '#00AEEF';
        ctx.fillText('TESTE', 265, 74);
      }
      ctx.restore();

      // 4. Main Catchy Flyer Headline (Perfect Line Separations & Margins)
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('É AGORA! PREPARA-TE', 50, 142);

      ctx.fillStyle = '#0095FF';
      ctx.font = '900 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('COM O MELHOR SITE PARA', 50, 172);

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 33px system-ui, -apple-system, sans-serif';
      ctx.fillText('TESTES DE CONCURSOS', 50, 218);
      ctx.fillText('PÚBLICO EM ANGOLA', 50, 258);

      // Cyan Action Banner Box: "FAÇA-O NO NGOLATESTE"
      ctx.fillStyle = '#00AEEF';
      ctx.beginPath();
      ctx.roundRect(50, 288, 440, 52, 12);
      ctx.fill();

      ctx.font = '900 26px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#001A3D';
      ctx.fillText('FAÇA-O NO ', 72, 324);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('NGOLATESTE', 215, 324);
      ctx.restore();

      // 5. Young Candidate Photo (Admin photo from Supabase)
      if (candidateImg) {
        ctx.save();
        ctx.beginPath();
        // Rounded portrait frame on right
        ctx.roundRect(520, 115, 510, 530, 32);
        ctx.clip();

        // Calculate aspect-ratio cover to center the face perfectly
        const imgAspect = candidateImg.width / (candidateImg.height || 1);
        const boxWidth = 510;
        const boxHeight = 530;
        const boxAspect = boxWidth / boxHeight;

        let drawWidth = boxWidth;
        let drawHeight = boxHeight;
        let drawX = 520;
        let drawY = 115;

        if (imgAspect < boxAspect) {
          drawWidth = boxWidth;
          drawHeight = boxWidth / imgAspect;
          drawY = 115 - (drawHeight - boxHeight) * 0.15; // prioritize face at top
        } else {
          drawHeight = boxHeight;
          drawWidth = boxHeight * imgAspect;
          drawX = 520 - (drawWidth - boxWidth) * 0.5;
        }

        ctx.drawImage(candidateImg, drawX, drawY, drawWidth, drawHeight);

        // Subtle gradient overlay at bottom of photo
        const photoGrad = ctx.createLinearGradient(520, 480, 520, 645);
        photoGrad.addColorStop(0, 'rgba(0, 112, 210, 0)');
        photoGrad.addColorStop(1, 'rgba(0, 41, 102, 0.6)');
        ctx.fillStyle = photoGrad;
        ctx.fillRect(520, 480, 510, 165);
        ctx.restore();

        // White border around candidate photo
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.roundRect(520, 115, 510, 530, 32);
        ctx.stroke();
        ctx.restore();
      }

      // 6. Subhead "Com Ngolateste, você tem:"
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Com ', 50, 375);
      ctx.fillStyle = '#0095FF';
      ctx.fillText('Ngolateste', 105, 375);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(', você tem:', 225, 375);
      ctx.restore();

      // 7. Feature Pills (Cyan rounded pill tags with white bullet dots)
      const features = [
        'Testes simulados com tópicos atualizados e antigos',
        'Diversas Áreas de Órgãos (MINSA, MININT, etc.)',
        'Desempenho controlado e nota em tempo real',
        'Estude onde estiver, no Celular / computador',
      ];

      features.forEach((feat, idx) => {
        const yPos = 402 + idx * 54;
        ctx.save();
        // Cyan Pill Background
        ctx.fillStyle = '#00AEEF';
        ctx.beginPath();
        ctx.roundRect(50, yPos, 445, 44, 22);
        ctx.fill();

        // White Bullet Circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(72, yPos + 22, 10, 0, Math.PI * 2);
        ctx.fill();

        // Bullet Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14.5px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(feat, 93, yPos + 28);
        ctx.restore();
      });

      // 8. Official Candidate Performance Card (Highlighted Result Box)
      ctx.save();
      const cardY = 665;
      // White/Blue Card Container
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#00AEEF';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.roundRect(50, cardY, 980, 235, 26);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      // Header inside Card
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(52, cardY + 2, 976, 50, [24, 24, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#0066cc';
      ctx.font = '900 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📊 DESEMPENHO OFICIAL DO CANDIDATO NO SIMULADO', 78, cardY + 33);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Candidato(a): ${candidateName}`, 990, cardY + 33);

      // Score Big Metrics
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 54px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${result.score} / ${result.total}`, 78, cardY + 120);

      ctx.fillStyle = '#0084FF';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(`ACERTOS (${scorePercentage}%)`, 78, cardY + 155);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Área: ${result.categoryName || result.testName || 'Concurso Público'}`, 78, cardY + 195);

      // Final Grade Badge (Gold Yellow with Red/Navy Text)
      ctx.fillStyle = '#FEF08A'; // bright yellow
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(470, cardY + 68, 520, 96, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#854D0E';
      ctx.font = '900 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CLASSIFICAÇÃO FINAL OFICIAL', 730, cardY + 100);

      ctx.fillStyle = '#1e293b';
      ctx.font = '900 38px system-ui, -apple-system, sans-serif';
      ctx.fillText(`NOTA: ${result.finalGrade} / 20 VALORES`, 730, cardY + 144);

      // Facebook 100 Likes Challenge Notice inside Card
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.roundRect(470, cardY + 176, 520, 44, 12);
      ctx.fill();

      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔥 Desafio 100 Likes no Facebook = 1 Inscrição Gratuita!', 730, cardY + 204);
      ctx.restore();

      // 9. Free vs Paid Modules Banner (Blue Card from flyer)
      ctx.save();
      const subCardY = 920;
      ctx.fillStyle = '#0070D2';
      ctx.beginPath();
      ctx.roundRect(50, subCardY, 980, 95, 20);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Testes Grátis: Cultura Geral, História de Angola e outros', 90, subCardY + 40);
      ctx.fillText('Testes Pagos: MINSA, MININT, Finanças e Várias áreas de Órgãos', 90, subCardY + 75);
      ctx.restore();

      // 10. Bottom Footer CTA Section (Dark Navy #001f3f)
      ctx.save();
      const footerY = 1035;
      ctx.fillStyle = '#001A3D'; // Deep Blue / Navy from flyer
      ctx.fillRect(0, footerY, 1080, 315);

      // Website URL Highlight (ngolateste.netlify.app)
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ACESSA AO SITE:', 50, footerY + 50);

      ctx.fillStyle = '#00E5FF'; // Electric Cyan URL
      ctx.font = '900 44px system-ui, -apple-system, sans-serif';
      ctx.fillText('ngolateste.netlify.app', 50, footerY + 105);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Ou baixe o aplicativo no celular / computador', 50, footerY + 140);

      // Price Tag (TESTE POR 1000 KZS DURANTE 2 SEMANAS)
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('TESTE POR ', 740, footerY + 60);

      ctx.fillStyle = '#FF3B30'; // Bold Red
      ctx.font = '900 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('1000 KZS', 920, footerY + 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 30px system-ui, -apple-system, sans-serif';
      ctx.fillText('DURANTE ', 780, footerY + 105);

      ctx.fillStyle = '#00E5FF'; // Cyan
      ctx.font = '900 30px system-ui, -apple-system, sans-serif';
      ctx.fillText('2 SEMANAS', 980, footerY + 105);

      // WhatsApp & Support Contacts Divider Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, footerY + 175);
      ctx.lineTo(1030, footerY + 175);
      ctx.stroke();

      // WhatsApp Info Row
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💬 Dúvidas Ligue ou puxe no WhatsApp:', 50, footerY + 220);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('+244 923 361 877   •   +244 952 274 756   •   +244 956 738 839', 50, footerY + 265);

      ctx.restore();

      return canvas;
    } catch (err) {
      console.error('Erro ao renderizar canvas:', err);
      return null;
    }
  };

  // Direct 1-Click Action: Automatically generates summary image, downloads it, copies to clipboard, triggers native share or opens Facebook
  const handleDirectFacebookShare = async () => {
    setIsGeneratingImage(true);
    setShareToast('A renderizar imagem oficial de desempenho...');

    try {
      const canvas = await renderCanvasCard();

      if (!canvas) {
        window.open('https://www.facebook.com/', '_blank');
        setIsShareModalOpen(true);
        return;
      }

      const imageUri = canvas.toDataURL('image/png', 1.0);
      setGeneratedImagePreview(imageUri);

      // Convert canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));

      const fileName = `ngolateste-resultado-${result.score}-pontos.png`;

      if (blob) {
        const imageFile = new File([blob], fileName, {
          type: 'image/png',
        });

        // 1. Always trigger download so the user has the high-resolution photo file on their device
        try {
          const downloadLink = document.createElement('a');
          downloadLink.download = fileName;
          downloadLink.href = imageUri;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (downloadErr) {
          console.warn('Erro ao disparar download:', downloadErr);
        }

        // 2. Try native Web Share with file on Mobile (anexa diretamente a foto na app do Facebook)
        if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
          try {
            await navigator.share({
              files: [imageFile],
              title: 'Meu Desempenho no NgolaTeste 🇦🇴',
              text: shareText,
            });
            setShareToast('Imagem oficial enviada para o Facebook com sucesso!');
            setTimeout(() => setShareToast(null), 5000);
            return;
          } catch (shareErr) {
            console.log('Native share cancelado ou fallback para Facebook Web:', shareErr);
          }
        }

        // 3. Copy image to clipboard for instant Ctrl+V pasting on Facebook post creator
        try {
          if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
          }
        } catch (clipImgErr) {
          console.log('Clipboard image write:', clipImgErr);
        }

        // 4. Copy caption text to clipboard
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareText);
          }
        } catch (clipTextErr) {
          console.warn('Erro ao copiar texto:', clipTextErr);
        }
      }

      // 5. Open Facebook directly (where users create photo post / paste)
      window.open('https://www.facebook.com/', '_blank');
      setIsShareModalOpen(true);
      setShareToast('Imagem oficial baixada e copiada! No Facebook aberto, clique em "Foto/Vídeo" ou pressione Ctrl+V para publicar a foto completa.');
      setTimeout(() => setShareToast(null), 8000);
    } catch (err) {
      console.error('Erro na partilha direta para o Facebook:', err);
      window.open('https://www.facebook.com/', '_blank');
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateAndDownloadCard = async () => {
    setIsGeneratingImage(true);

    try {
      const canvas = await renderCanvasCard();
      if (!canvas) {
        alert('Não foi possível gerar a imagem no seu navegador.');
        return;
      }

      const imageUri = canvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      downloadLink.download = `ngolateste-resultado-${result.score}-pontos.png`;
      downloadLink.href = imageUri;
      downloadLink.click();
    } catch (err) {
      console.error('Erro ao gerar cartão de imagem:', err);
      alert('Erro ao gerar imagem. Você pode copiar o texto da publicação.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const fetchAiTip = async () => {
    setIsLoadingAiTip(true);
    try {
      const res = await fetch('/api/gemini/study-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: result.categoryName,
          score: result.score,
          totalQuestions: result.total,
          wrongCategories: ['Legislação', 'Direito Administrativo'],
        }),
      });
      const data = await res.json();
      if (data.tip) {
        setAiTip(data.tip);
      }
    } catch (err) {
      console.error('Error fetching AI tip:', err);
    } finally {
      setIsLoadingAiTip(false);
    }
  };

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-4xl mx-auto">
      {/* Result Header Section */}
      <section className="text-center mb-8">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-3 text-slate-900">
          Parabéns pelo esforço!
        </h2>
        <p className="text-slate-600 text-base md:text-lg max-w-md mx-auto leading-relaxed">
          Você concluiu o simulado. Veja abaixo o seu desempenho detalhado para continuar evoluindo.
        </p>
      </section>

      {/* Result Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Main Score Card with Facebook Share Callout */}
        <div className="md:col-span-8 bg-white rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-[0_4px_32px_rgba(0,0,0,0.04)] relative overflow-hidden border border-slate-100">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400" />

          {/* Facebook Challenge Top Badge */}
          <div className="w-full mb-4">
            <button
              onClick={handleDirectFacebookShare}
              disabled={isGeneratingImage}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl p-3.5 shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-between gap-2 text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  {isGeneratingImage ? (
                    <span className="material-symbols-outlined text-white text-base animate-spin">refresh</span>
                  ) : (
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded uppercase">
                      Desafio
                    </span>
                    <span className="text-xs md:text-sm font-black text-white">
                      Partilhar resultado se tiver 100 likes, ganha 1 inscrição grátis
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-100 truncate">
                    {isGeneratingImage ? 'A gerar imagem oficial do resumo...' : 'Gera a imagem de desempenho e abre o Facebook para publicar'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 bg-white text-blue-900 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 group-hover:bg-blue-50 transition-colors">
                <span>{isGeneratingImage ? 'A gerar...' : 'Partilhar'}</span>
                <span className="material-symbols-outlined text-xs">
                  {isGeneratingImage ? 'hourglass_top' : 'arrow_forward'}
                </span>
              </div>
            </button>
          </div>

          {/* Circular Progress Gauge */}
          <div className="relative w-44 h-44 md:w-48 md:h-48 flex items-center justify-center mb-4">
            <svg className="w-full h-full -rotate-90">
              <circle
                className="text-slate-100"
                cx="96"
                cy="96"
                fill="transparent"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
              />
              <circle
                className="text-blue-600 transition-all duration-1000 ease-out"
                cx="96"
                cy="96"
                fill="transparent"
                r="88"
                stroke="currentColor"
                strokeDasharray="552.92"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="12"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl md:text-5xl font-black text-slate-900">
                {result.score}/{result.total}
              </span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                ACERTOS
              </span>
            </div>
          </div>

          <div className="space-y-1 mb-4">
            <h3 className="text-2xl font-bold text-slate-900">
              Desempenho de {scorePercentage}%
            </h3>
            <p className="text-slate-500 text-sm">
              Você está acima da média dos candidatos para esta categoria.
            </p>
          </div>

          {/* Action Row inside Score Card for Direct Share & Download */}
          <div className="w-full pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={handleDirectFacebookShare}
              disabled={isGeneratingImage}
              className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center"
            >
              {isGeneratingImage ? (
                <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
              ) : (
                <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
              <span>{isGeneratingImage ? 'A gerar imagem...' : 'Partilhar resultado se tiver 100 likes, ganha 1 inscrição grátis'}</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">info</span>
              <span>Regras do Desafio</span>
            </button>
          </div>
        </div>

        {/* Stats Column (Correct / Incorrect) */}
        <div className="md:col-span-4 flex flex-col gap-4">
          {/* Correct Stats */}
          <div className="flex-1 bg-white rounded-3xl p-6 flex flex-col justify-between border-l-8 border-blue-600 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span
                className="material-symbols-outlined text-blue-600 text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <span className="text-3xl font-black text-blue-600">
                {result.correctCount.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="text-slate-700 font-bold text-sm">Respostas Corretas</span>
          </div>

          {/* Incorrect Stats */}
          <div className="flex-1 bg-white rounded-3xl p-6 flex flex-col justify-between border-l-8 border-red-500 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span
                className="material-symbols-outlined text-red-500 text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                cancel
              </span>
              <span className="text-3xl font-black text-red-500">
                {result.incorrectCount.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="text-slate-700 font-bold text-sm">Respostas Incorretas</span>
          </div>
        </div>

        {/* Final Grade Section */}
        <div className="md:col-span-12 bg-white rounded-3xl p-6 flex items-center justify-between border border-blue-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100/80 rounded-2xl flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined">grade</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                NOTA FINAL
              </h4>
              <p className="text-xs text-slate-400">Avaliação máxima: 20 valores</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-blue-600">{result.finalGrade}</span>
            <span className="text-xl font-bold text-slate-400"> / 20</span>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">
              VALORES
            </p>
          </div>
        </div>

        {/* Focus Mode Study Tip Card */}
        <div className="md:col-span-12 bg-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-blue-100 shadow-sm relative">
          <div className="w-16 h-16 bg-blue-100/80 rounded-2xl flex items-center justify-center shrink-0 text-blue-600">
            <span className="material-symbols-outlined text-3xl">lightbulb</span>
          </div>

          <div className="text-center md:text-left flex-1 space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h4 className="text-lg font-bold text-slate-900">Dica de Estudo</h4>
              <button
                onClick={fetchAiTip}
                disabled={isLoadingAiTip}
                className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                title="Pedir orientação personalizada à IA"
              >
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                {isLoadingAiTip ? 'Analisando...' : 'Pedir IA'}
              </button>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              {aiTip}
            </p>
          </div>

          <div className="shrink-0 text-center">
            <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-4/5" />
            </div>
            <p className="text-[10px] uppercase tracking-wider mt-2 font-bold text-blue-600">
              PROGRESSO SEMANAL
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={onRestartExam}
          className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined">refresh</span>
          <span>Refazer Teste</span>
        </button>

        <button
          onClick={() => onNavigate('home')}
          className="w-full sm:w-auto px-10 py-4 bg-white text-blue-700 border-2 border-blue-200 hover:bg-blue-50/50 rounded-xl font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined">home</span>
          <span>Voltar ao Início</span>
        </button>
      </div>

      {/* ================= MODAL: DESAFIO FACEBOOK & PARTILHA ================= */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                🏆 Promoção Especial & Desafio
              </span>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                Partilhe no Facebook & Ganhe Inscrição Grátis!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mostre o seu desempenho no Facebook e motive outros candidatos. Se a sua publicação alcançar <strong>100 ou mais curtidas/likes</strong>, você ganha <strong>1 ativação grátis</strong> na sua especialidade!
              </p>
            </div>

            {/* How It Works Steps */}
            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2.5 text-xs text-slate-700">
              <span className="font-black text-blue-900 block uppercase tracking-wider text-[10px]">
                📸 Como publicar a imagem completa no Facebook:
              </span>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>A imagem foi <strong>baixada e copiada</strong> automaticamente para o seu dispositivo.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                <span>No Facebook aberto, clique em <strong>"No que você está pensando?"</strong> e pressione <strong>Ctrl + V (Colar)</strong> ou clique em <strong>"Foto/Vídeo"</strong> para selecionar a imagem oficial baixada.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                <span>Alcance <strong>100 likes</strong> e envie o print ao suporte pelo WhatsApp (+244 923 361 877) para receber 1 inscrição grátis!</span>
              </div>
            </div>

            {/* Preview of Generated Share Flyer or Live Card */}
            {generatedImagePreview ? (
              <div className="space-y-2 text-center">
                <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 max-h-72 flex items-center justify-center">
                  <img
                    src={generatedImagePreview}
                    alt="Cartão Oficial de Desempenho"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200 inline-block">
                  ✓ Imagem descarregada e copiada para a área de transferência!
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#001A3D] via-[#0050b3] to-[#00AEEF] rounded-2xl p-4 text-white shadow-md relative overflow-hidden space-y-2.5 text-left border border-cyan-300/30">
                <div className="flex items-center justify-between text-[11px] text-cyan-200 font-bold border-b border-white/15 pb-2">
                  <span>🇦🇴 NgolaTeste • Resumo Oficial</span>
                  <span className="bg-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded-md text-[10px]">
                    {result.finalGrade} / 20 Valores
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-cyan-100 font-bold block">{candidateName}</span>
                  <span className="text-sm font-black text-white block">
                    {result.score} de {result.total} Questões Corretas ({scorePercentage}%)
                  </span>
                  <span className="text-[11px] text-cyan-200 block">{result.categoryName || result.testName}</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2 text-[10px] text-white flex items-center justify-between">
                  <span>👉 Acesse no site oficial:</span>
                  <span className="font-black text-cyan-300">ngolateste.netlify.app</span>
                </div>
                <p className="text-[10px] text-slate-200 italic">
                  “Quem estuda com foco conquista a aprovação nos Concursos Públicos em Angola.”
                </p>
              </div>
            )}

            {/* Main Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleDirectFacebookShare}
                disabled={isGeneratingImage}
                className="w-full py-3.5 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl font-black text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                {isGeneratingImage ? (
                  <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                ) : (
                  <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                <span>{isGeneratingImage ? 'A gerar imagem...' : 'Partilhar resultado se tiver 100 likes, ganha 1 inscrição grátis'}</span>
              </button>

              <button
                onClick={handleGenerateAndDownloadCard}
                disabled={isGeneratingImage}
                className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-200"
              >
                <span className={`material-symbols-outlined text-base ${isGeneratingImage ? 'animate-spin' : ''}`}>
                  {isGeneratingImage ? 'refresh' : 'download_for_offline'}
                </span>
                <span>{isGeneratingImage ? 'Gerando Imagem...' : 'Baixar Imagem Oficial (PNG 1080×1350)'}</span>
              </button>

              <button
                onClick={handleCopyText}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedToast ? 'check' : 'content_copy'}
                </span>
                <span>{copiedToast ? 'Texto Copiado com Sucesso!' : 'Copiar Texto Pronto para Colar no Facebook'}</span>
              </button>

              <a
                href={`https://wa.me/244923361877?text=${encodeURIComponent(
                  `Olá Equipa NgolaTeste! Partilhei o meu resultado do simulado no Facebook (${candidateName} - Nota: ${result.finalGrade}/20). Estou a participar no Desafio dos 100 Likes para ganhar a Inscrição Gratuita!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 text-center border border-emerald-200"
              >
                <span className="material-symbols-outlined text-emerald-600 text-sm">chat</span>
                <span>Avisar Suporte no WhatsApp (+244 923 361 877)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Notification Toast */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce-short">
          <span className="material-symbols-outlined text-cyan-400 text-xl">auto_awesome</span>
          <span className="text-xs font-bold">{shareToast}</span>
        </div>
      )}
    </div>
  );
};

