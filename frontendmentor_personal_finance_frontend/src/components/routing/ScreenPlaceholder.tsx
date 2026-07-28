/**
 * Titled placeholder for nav destinations whose real screens aren't built
 * yet, so all navigation targets are live. Replaced by the real screens in
 * their own later components.
 */
function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-[2rem] font-bold text-grey-900">{title}</h1>
      <p className="mt-4 text-grey-500">This screen is coming in a later step.</p>
    </div>
  );
}

export default ScreenPlaceholder;
