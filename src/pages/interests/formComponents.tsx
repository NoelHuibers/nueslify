//formComponents.tsx
import React from "react";
import { z } from "zod";

export const TextField: React.FC<any> = ({ value, onChange, ...rest }) => (
    <input
        type="text"
        value={value}
        onChange={(e) =>
            onChange(e.target.value)} {...rest} />
);

export const CheckBoxField: React.FC<any> = ({ value, onChange, ...rest }) => (
    <input
        type="checkbox"
        checked={value}
        onChange={(e) =>
            onChange(e.target.checked)} {...rest} />
);

export const NumberField: React.FC<any> = ({ value, onChange, ...rest }) => (
    <input
        type="number"
        value={value}
        onChange={(e) =>
            onChange(parseInt(e.target.value, 10))} {...rest} />
);