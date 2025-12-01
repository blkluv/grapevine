import type { Story } from '@ladle/react';
import { Button, Card } from '@/components/ui';

export const DesignSystem: Story = () => {
  return (
    <div className="p-8 space-y-12 max-w-5xl mx-auto">
      {/* Buttons Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-h2 mb-2">Buttons</h2>
          <p className="text-body-sm text-foreground/60">
            90s Windows-style beveled buttons
          </p>
        </div>

        <Card variant="default" padding="lg">
          <div className="space-y-6">
            <div>
              <div className="text-caption text-foreground/60 mb-3 uppercase tracking-wide">
                Primary
              </div>
              <div className="flex gap-4 items-center">
                <Button variant="primary">Primary Button</Button>
                <Button variant="primary" loading>Loading...</Button>
              </div>
            </div>

            <div>
              <div className="text-caption text-foreground/60 mb-3 uppercase tracking-wide">
                Secondary
              </div>
              <div className="flex gap-4 items-center">
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="secondary" loading>Loading...</Button>
              </div>
            </div>

            <div>
              <div className="text-caption text-foreground/60 mb-3 uppercase tracking-wide">
                Success
              </div>
              <div className="flex gap-4 items-center">
                <Button variant="success">Success Button</Button>
                <Button variant="success" loading>Loading...</Button>
              </div>
            </div>

            <div>
              <div className="text-caption text-foreground/60 mb-3 uppercase tracking-wide">
                Warning
              </div>
              <div className="flex gap-4 items-center">
                <Button variant="warning">Warning Button</Button>
                <Button variant="warning" loading>Loading...</Button>
              </div>
            </div>

            <div>
              <div className="text-caption text-foreground/60 mb-3 uppercase tracking-wide">
                Danger
              </div>
              <div className="flex gap-4 items-center">
                <Button variant="danger">Danger Button</Button>
                <Button variant="danger" loading>Loading...</Button>
              </div>
            </div>

            <div>
              <div className="text-caption text-foreground/60 mb-3 uppercase tracking-wide">
                Ghost
              </div>
              <div className="flex gap-4 items-center">
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="ghost" loading>Loading...</Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Color Palette Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-h2 mb-2">Color Palette</h2>
          <p className="text-body-sm text-foreground/60">
            Design tokens and color system
          </p>
        </div>

        <Card variant="default" padding="lg">
          <div className="space-y-6">
            <div>
              <h3 className="text-h3 mb-4">Brand Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-[var(--main)]" />
                  <div className="text-caption mt-2">Main Purple</div>
                  <div className="text-caption text-foreground/60">#A79AFF</div>
                </div>
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-[var(--bg)]" />
                  <div className="text-caption mt-2">Background</div>
                  <div className="text-caption text-foreground/60">#F5F7FF</div>
                </div>
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-[var(--bw)]" />
                  <div className="text-caption mt-2">White</div>
                  <div className="text-caption text-foreground/60">#FFFFFF</div>
                </div>
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-[var(--text)]" />
                  <div className="text-caption mt-2">Text</div>
                  <div className="text-caption text-foreground/60">#171420</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Surface Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-win95-paper" />
                  <div className="text-caption mt-2">Paper</div>
                  <div className="text-caption text-foreground/60">#E0E0E0</div>
                </div>
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-win95-paperDark" />
                  <div className="text-caption mt-2">Paper Dark</div>
                  <div className="text-caption text-foreground/60">#C0C0C0</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">State Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-success" />
                  <div className="text-caption mt-2">Success</div>
                  <div className="text-caption text-foreground/60">#37BE75</div>
                </div>
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-warning" />
                  <div className="text-caption mt-2">Warning</div>
                  <div className="text-caption text-foreground/60">#FF9900</div>
                </div>
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-error" />
                  <div className="text-caption mt-2">Error</div>
                  <div className="text-caption text-foreground/60">#DE5242</div>
                </div>
                <div>
                  <div className="h-16 rounded-base border-2 border-black bg-info" />
                  <div className="text-caption mt-2">Info</div>
                  <div className="text-caption text-foreground/60">#57C2FF</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
