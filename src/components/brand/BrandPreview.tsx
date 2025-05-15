
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BrandPreviewProps {
  brandName: string;
  brandTone: string;
  primaryColor: string;
  secondaryColor: string;
}

const BrandPreview = ({
  brandName,
  brandTone,
  primaryColor,
  secondaryColor,
}: BrandPreviewProps) => {
  return (
    <Card className="border-none shadow-md h-full">
      <CardHeader>
        <CardTitle>Brand Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-6 rounded-lg border border-gray-200" style={{ 
            background: `linear-gradient(135deg, ${primaryColor || '#0EA5E9'} 0%, ${secondaryColor || '#6E59A5'} 100%)`,
          }}>
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold" style={{ color: primaryColor || '#0EA5E9' }}>
                {brandName || 'Your Brand Name'}
              </h3>
              <p className="text-sm mt-2" style={{ color: secondaryColor || '#6E59A5' }}>
                {brandTone ? `${brandTone.charAt(0).toUpperCase() + brandTone.slice(1)} tone` : 'Select a brand tone'}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-sm uppercase text-gray-500">Color Palette</h3>
            <div className="flex space-x-2">
              <div className="flex-1">
                <div className="h-8 rounded-md" style={{ backgroundColor: primaryColor || '#0EA5E9' }}></div>
                <p className="text-xs mt-1 text-center">Primary</p>
              </div>
              <div className="flex-1">
                <div className="h-8 rounded-md" style={{ backgroundColor: secondaryColor || '#6E59A5' }}></div>
                <p className="text-xs mt-1 text-center">Secondary</p>
              </div>
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Complete the form to set up your brand guidelines and start creating campaigns
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandPreview;
