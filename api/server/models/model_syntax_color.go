package models

// SyntaxColor - A syntax color and regex string for highlighting text
type SyntaxColor struct {
	Color string `json:"color,omitempty"`

	Regex string `json:"regex,omitempty"`
}

// SyntaxColors - An array/slice of syntax colors
type SyntaxColors []SyntaxColor
