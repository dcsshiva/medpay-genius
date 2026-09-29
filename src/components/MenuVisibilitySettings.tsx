import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Search, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getNavigationItems } from '@/lib/navigationItems';
import { toast } from 'sonner';

interface MenuItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  is_visible: boolean;
}

const MENU_GROUPS: Record<string, string[]> = {
  'Core': ['dashboard', 'user-guide', 'masters'],
  'People': ['staff', 'attendance', 'payroll'],
  'Reports': ['login-reports', 'navigation-analytics'],
  'Collaboration': ['tasks', 'appraisals', 'leave-approvals', 'complaints', 'chat'],
  'System': ['version', 'website-settings', 'ai-knowledge-base', 'settings'],
};

const ALWAYS_VISIBLE = ['dashboard', 'settings'];

const MenuVisibilitySettings = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<MenuItemConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get the full super_admin navigation list
  const allNavItems = useMemo(() => 
    getNavigationItems({ userRole: 'super_admin', userDesignation: 'super_admin' }), 
  []);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data: configData } = await supabase
      .from('sidebar_menu_config')
      .select('menu_item_id, is_visible');

    const configMap = new Map(
      (configData || []).map(c => [c.menu_item_id, c.is_visible])
    );

    setItems(allNavItems.map(nav => ({
      id: nav.id,
      label: nav.label,
      icon: nav.icon,
      is_visible: configMap.has(nav.id) ? configMap.get(nav.id)! : true,
    })));
    setHasChanges(false);
  };

  const toggleItem = (id: string) => {
    if (ALWAYS_VISIBLE.includes(id)) return;
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, is_visible: !item.is_visible } : item
    ));
    setHasChanges(true);
  };

  const handleBulkAction = (visible: boolean) => {
    setItems(prev => prev.map(item => 
      ALWAYS_VISIBLE.includes(item.id) ? item : { ...item, is_visible: visible }
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upsert all items
      const upsertData = items.map((item, index) => ({
        menu_item_id: item.id,
        is_visible: item.is_visible,
        display_order: index,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }));

      for (const row of upsertData) {
        const { error } = await supabase
          .from('sidebar_menu_config')
          .upsert(row, { onConflict: 'menu_item_id' });
        if (error) throw error;
      }

      toast.success('Menu visibility saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving menu config:', error);
      toast.error('Failed to save menu visibility settings');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const result: Record<string, MenuItemConfig[]> = {};

    for (const [group, ids] of Object.entries(MENU_GROUPS)) {
      const groupItems = ids
        .map(id => items.find(item => item.id === id))
        .filter((item): item is MenuItemConfig => 
          !!item && (!query || item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query))
        );
      if (groupItems.length > 0) result[group] = groupItems;
    }

    // Items not in any group
    const allGroupedIds = Object.values(MENU_GROUPS).flat();
    const ungrouped = items.filter(
      item => !allGroupedIds.includes(item.id) && 
      (!query || item.label.toLowerCase().includes(query))
    );
    if (ungrouped.length > 0) result['Other'] = ungrouped;

    return result;
  }, [items, searchQuery]);

  const visibleCount = items.filter(i => i.is_visible).length;
  const hiddenCount = items.filter(i => !i.is_visible).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="default" className="text-sm">
          <Eye className="h-3 w-3 mr-1" /> {visibleCount} Visible
        </Badge>
        <Badge variant="secondary" className="text-sm">
          <EyeOff className="h-3 w-3 mr-1" /> {hiddenCount} Hidden
        </Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => handleBulkAction(true)}>
          Show All
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleBulkAction(false)}>
          Hide All
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {Object.entries(filteredGroups).map(([group, groupItems]) => (
          <Card key={group}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {group}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {groupItems.map(item => {
                  const Icon = item.icon;
                  const isLocked = ALWAYS_VISIBLE.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.label}</span>
                        {isLocked && (
                          <Badge variant="outline" className="text-xs">Always visible</Badge>
                        )}
                      </div>
                      <Switch
                        checked={item.is_visible}
                        onCheckedChange={() => toggleItem(item.id)}
                        disabled={isLocked}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Bar */}
      {hasChanges && (
        <div className="sticky bottom-4 flex items-center justify-end gap-3 p-4 bg-background border rounded-lg shadow-lg">
          <Button variant="outline" onClick={loadConfig}>
            <RotateCcw className="h-4 w-4 mr-2" /> Discard
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MenuVisibilitySettings;
