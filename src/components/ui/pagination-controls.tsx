import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
  totalRecords: number;
  recordsPerPage: number | 'all';
  currentPage: number;
  onPageChange: (page: number) => void;
  onRecordsPerPageChange: (value: number | 'all') => void;
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  totalRecords,
  recordsPerPage,
  currentPage,
  onPageChange,
  onRecordsPerPageChange,
  className
}) => {
  const totalPages = recordsPerPage === 'all' 
    ? 1 
    : Math.ceil(totalRecords / recordsPerPage);

  const indexOfLastRecord = recordsPerPage === 'all' 
    ? totalRecords 
    : currentPage * recordsPerPage;
  const indexOfFirstRecord = recordsPerPage === 'all' 
    ? 1 
    : indexOfLastRecord - recordsPerPage + 1;

  const displayedRecords = recordsPerPage === 'all' 
    ? totalRecords 
    : Math.min(indexOfLastRecord, totalRecords);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleRecordsPerPageChange = (value: string) => {
    if (value === 'all') {
      onRecordsPerPageChange('all');
    } else {
      onRecordsPerPageChange(parseInt(value));
    }
  };

  return (
    <div className={cn("flex items-center justify-between gap-4 flex-wrap", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select 
          value={recordsPerPage.toString()} 
          onValueChange={handleRecordsPerPageChange}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          per page
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Showing {indexOfFirstRecord}-{displayedRecords} of {totalRecords} records
        </span>

        {recordsPerPage !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }

              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="min-w-[36px]"
                >
                  {page}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
