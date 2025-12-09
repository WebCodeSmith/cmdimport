package utils

import (
	"fmt"
	"strconv"
)

// ReplaceCommaWithDot substitui vírgula por ponto (formato brasileiro)
// Exemplo: "123,45" -> "123.45"
func ReplaceCommaWithDot(s string) string {
	result := ""
	dotFound := false
	for _, char := range s {
		if char == ',' && !dotFound {
			result += "."
			dotFound = true
		} else if char != '.' || !dotFound {
			result += string(char)
		}
	}
	return result
}

// ParseFloatFlexible aceita tanto string quanto número e converte para float64
// Aceita formato brasileiro (vírgula) e formato internacional (ponto)
func ParseFloatFlexible(v interface{}) (*float64, error) {
	if v == nil {
		return nil, nil
	}

	switch val := v.(type) {
	case float64:
		return &val, nil
	case int:
		f := float64(val)
		return &f, nil
	case string:
		if val == "" {
			return nil, nil
		}
		// Substituir vírgula por ponto (formato brasileiro)
		val = ReplaceCommaWithDot(val)
		f, err := strconv.ParseFloat(val, 64)
		if err != nil {
			return nil, err
		}
		return &f, nil
	default:
		return nil, fmt.Errorf("tipo não suportado: %T", v)
	}
}

// ParseIntFlexible aceita tanto string quanto número e converte para int
func ParseIntFlexible(v interface{}) (*int, error) {
	if v == nil {
		return nil, nil
	}

	switch val := v.(type) {
	case int:
		return &val, nil
	case float64:
		i := int(val)
		return &i, nil
	case string:
		if val == "" {
			return nil, nil
		}
		i, err := strconv.Atoi(val)
		if err != nil {
			return nil, err
		}
		return &i, nil
	default:
		return nil, fmt.Errorf("tipo não suportado: %T", v)
	}
}

// ParseFloatBR converte string brasileira (com vírgula) para float64
func ParseFloatBR(s string) (float64, error) {
	s = ReplaceCommaWithDot(s)
	return strconv.ParseFloat(s, 64)
}

