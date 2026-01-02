import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

const sizeClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[500px]',
  lg: 'max-w-[600px]',
  xl: 'max-w-[800px]',
};

export default function SlidePanel({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
}: SlidePanelProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        {/* Panel Container */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel
                  className={`pointer-events-auto w-screen ${sizeClasses[size]}`}
                >
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    {(title || showClose) && (
                      <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
                        <div className="flex-1">
                          {title && (
                            <Dialog.Title className="text-lg font-semibold text-gray-900">
                              {title}
                            </Dialog.Title>
                          )}
                          {description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {description}
                            </p>
                          )}
                        </div>
                        {showClose && (
                          <button
                            onClick={onClose}
                            className="ml-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                      <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 bg-gray-50">
                        {footer}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
