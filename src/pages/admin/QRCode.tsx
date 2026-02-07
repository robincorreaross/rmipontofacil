import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, Smartphone } from 'lucide-react';
import { useRef } from 'react';

const QRCodePage = () => {
  const clockInUrl = `${window.location.origin}/ponto`;
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    canvas.width = 800;
    canvas.height = 800;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 700, 700);
        
        const link = document.createElement('a');
        link.download = 'qrcode-ponto.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">QR Code</h1>
          <p className="text-muted-foreground text-sm">Imprima e deixe no local de trabalho para os funcionários registrarem o ponto</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardContent className="p-8 flex flex-col items-center space-y-6">
              <div ref={qrRef} className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                <QRCodeSVG
                  value={clockInUrl}
                  size={256}
                  level="H"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="hsl(220, 30%, 12%)"
                />
              </div>

              <Button onClick={handleDownload} className="gradient-primary border-0 text-primary-foreground font-display">
                <Download className="w-4 h-4 mr-2" />
                Baixar QR Code
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">Como funciona</h3>
                    <p className="text-sm text-muted-foreground">Instruções de uso</p>
                  </div>
                </div>

                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                    <span>Imprima o QR Code e fixe em um local visível na entrada da loja</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                    <span>O funcionário aponta a câmera do celular para o QR Code</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                    <span>Digita o CPF e confirma o nome</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
                    <span>O sistema registra automaticamente o tipo de ponto (entrada, intervalo, etc.)</span>
                  </li>
                </ol>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <Smartphone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Link direto:</p>
                  <p className="break-all">{clockInUrl}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default QRCodePage;
