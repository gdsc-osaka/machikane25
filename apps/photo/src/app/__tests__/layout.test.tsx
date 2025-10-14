import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import RootLayout from "@/app/layout";

vi.mock('../globals.css', () => ({}))
// mock Geist font
vi.mock('next/font/google', async (importActual) => {
    const actual = await importActual<typeof import('next/font/google')>()
    return {
        ...actual,
        Geist: () => ({ variable: '--font-geist-sans' }),
        Geist_Mono: () => ({ variable: '--font-geist-mono' }),
    }
})

test('RootLayout', () => {
    render(
        <RootLayout>
            <div data-testid="child-element">Hello World</div>
        </RootLayout>
    )

    // RootLayout に渡した子要素が正しくレンダリングされているか確認
    const childElement = screen.getByTestId('child-element')
    expect(childElement).toBeDefined()
    expect(screen.getByText('Hello World')).toBeDefined()
})
