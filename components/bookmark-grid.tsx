import React from "react";

export const BookmarkGrid = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {React.Children.map(children, (child, index) => (
        <div
          key={
            React.isValidElement(child) && child.key != null ? child.key : index
          }
          className="h-full fade-in [contain-intrinsic-size:auto_390px] [content-visibility:auto]"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};
