"use client";

import { useFormStatus } from "react-dom";

export default function AddToCartButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={pending ? "btn btn-ghost btn-full" : "btn btn-outline btn-full"}
      style={{ marginTop: "auto" }}
    >
      {pending ? "Adding..." : "Add to Cart"}
    </button>
  );
}
