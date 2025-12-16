import type { Config } from 'tailwindcss'

export default <Config>{
    theme: {
        extend: {
            colors: {
                dietator: {
                    50: '#fffee7',
                    100: '#fffcc3',
                    200: '#fff888',
                    300: '#ffef44',
                    400: '#f5dc00', // Matches icon roughly
                    500: '#f5dc00', // Primary
                    600: '#cba800',
                    700: '#a27d05',
                    800: '#86640d',
                    900: '#725211',
                    950: '#432d03'
                }
            }
        }
    }
}
