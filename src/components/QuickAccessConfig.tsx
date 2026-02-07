import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, BarChart3, Hand, Search, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuickAccessConfig } from '@/hooks/useQuickAccessConfig';
import { getNavigationItems, NavigationItem } from '@/lib/navigationItems';

const QuickAccessConfig = () => {
  const { config, isLoading, updateConfig } = useQuickAccessConfig();
  const [mode, setMode] = useState<'analytics' | 'manual'>('analytics');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Get the full admin navigation list for the checklist
  const allNavItems = useMemo(() => {
    return getNavigationItems({
      userRole: 'super_admin',
      userDesignation: 'super_admin',
    });
  }, []);

  // Sync local state with fetched config
  useEffect(() => {
    if (config) {
      setMode(config.mode);
      setSelectedItems(config.manual_items || []);
      setHasChanges(false);
    }
  }, [config]);

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return allNavItems;
    const query = searchQuery.toLowerCase();
    return allNavItems.filter(item =>
      item.label.toLowerCase().includes(query)
    );
  }, [allNavItems, searchQuery]);

  const handleModeChange = (newMode: 'analytics' | 'manual') => {
    setMode(newMode);
    setHasChanges(true);
  };

  const handleToggleItem = (label: string) => {
    setSelectedItems(prev => {
      const next = prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label];
      setHasChanges(true);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allLabels = allNavItems.map(item => item.label);
    setSelectedItems(allLabels);
    setHasChanges(true);
  };

  const handleClearAll = () => {
    setSelectedItems([]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync({
        mode,
        manual_items: mode === 'manual' ? selectedItems : [],
      });
      toast.success('Quick Access configuration saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Access Menu Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as 'analytics' | 'manual')}>
          {/* Analytics option */}
          <div
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              mode === 'analytics' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
            onClick={() => handleModeChange('analytics')}
          >
            <RadioGroupItem value="analytics" id="mode-analytics" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-analytics" className="font-medium cursor-pointer flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                From Navigation Analytics
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically shows the top 6 most-used navigation items based on usage data from the last 30 days.
              </p>
            </div>
          </div>

          {/* Manual option */}
          <div
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              mode === 'manual' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
            onClick={() => handleModeChange('manual')}
          >
            <RadioGroupItem value="manual" id="mode-manual" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-manual" className="font-medium cursor-pointer flex items-center gap-2">
                <Hand className="h-4 w-4 text-primary" />
                Manual Selection
                {mode === 'manual' && selectedItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedItems.length} selected
                  </Badge>
                )}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Manually choose which navigation items appear in the Quick Access section.
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Manual selection checklist */}
        {mode === 'manual' && (
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search navigation items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-1 pr-4">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isChecked = selectedItems.includes(item.label);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        isChecked ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleItem(item.label)}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateConfig.isPending}
          >
            {updateConfig.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickAccessConfig;
