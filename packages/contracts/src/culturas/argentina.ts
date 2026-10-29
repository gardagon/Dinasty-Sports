import { lista, type Cultura } from './tipos';
import { LATINOAMERICA } from './latinoamerica';

/** Nombres y apodos habituales de Argentina (los comparten las dos culturas: la criolla y la de origen italiano). */
const NOMBRES_ARGENTINA: Cultura['nombres'] = {
  f: {
    jovenes: lista('Emma, Mía, Martina, Isabella, Catalina, Sofía, Alma, Delfina, Valentina, Olivia, Emilia, Juana, Josefina, Julieta, Renata, Luna, Lola, Pilar, Francesca, Abril, Camila, Candela, Zoe, Malena, Bianca, Antonella, Guadalupe, Milagros, Morena, Victoria, Agustina, Florencia, Lucía, Paulina, Rosario, Trinidad, Mora, Ana, Lara, Pía, Nina, Regina, Elena, Uma, Ámbar, Aitana, Bárbara, Carla, Clara, Constanza'),
    adultos: lista('María, Marta, Susana, Graciela, Alicia, Norma, Liliana, Silvia, Patricia, Mónica, Claudia, Laura, Gabriela, Andrea, Carolina, Verónica, Silvana, Marcela, Adriana, Cristina, Sandra, Viviana, Beatriz, Ana, Julia, Rosa, Elena, Mariana, Natalia, Romina, Soledad, Paula, Lorena, Florencia, Cecilia, Karina, Marina, Estela, Nélida, Ester, Mirta, Teresa, Raquel, Inés, Lucía, Gladys, Ramona, Delia, Hilda, Olga'),
  },
  m: {
    jovenes: lista('Santiago, Mateo, Benjamín, Thiago, Bautista, Juan Cruz, Valentino, Joaquín, Lautaro, Francisco, Felipe, Lorenzo, Tomás, Bruno, Santino, Facundo, Nicolás, Ian, Agustín, Matías, Lucas, Franco, Alejo, Dante, Ciro, Gael, Emiliano, Ramiro, Tadeo, Ezequiel, León, Simón, Juan, Pedro, Luciano, Gonzalo, Máximo, Martín, Federico, Manuel, Julián, Axel, Dylan, Noah, Leo, Gerónimo, Nahuel, Valentín, Uriel, Lisandro'),
    adultos: lista('Carlos, Jorge, Roberto, Daniel, Héctor, Oscar, Marcelo, Gustavo, Fernando, Alejandro, Diego, Martín, Pablo, Sergio, Claudio, Ricardo, Luis, Eduardo, Miguel, Raúl, Walter, Hugo, Julio, Adrián, Gabriel, Sebastián, Leonardo, Gonzalo, Guillermo, Rubén, Ariel, Cristian, Mariano, Juan, José, Antonio, Alberto, Ramón, Néstor, Osvaldo, Horacio, Norberto, Rodolfo, Aníbal, Esteban, Hernán, Fabián, Maximiliano, Pedro, Víctor'),
  },
};

const APODOS_ARGENTINA: NonNullable<Cultura['apodos']> = {
  Francisco: ['Pancho', 'Fran'], Santiago: ['Santi'], Matías: ['Mati'], Nicolás: ['Nico'], Ezequiel: ['Eze'], Facundo: ['Facu'], Agustín: ['Agus'], Guadalupe: ['Lupe'], Florencia: ['Flor', 'Flopy'], Alejandro: ['Ale', 'Alejo'],
  Cristian: ['Cris'], Eduardo: ['Lalo', 'Edu'], Guillermo: ['Memo', 'Guille'], Gonzalo: ['Gonza'], Maximiliano: ['Maxi'], Valentina: ['Valen', 'Vale'], Josefina: ['Jose', 'Josefi'], Milagros: ['Mili'], Federico: ['Fede'], Rodrigo: ['Rodri'],
  Sebastián: ['Seba'], Roberto: ['Beto'], Fernando: ['Fer'], Gabriela: ['Gaby'], Marcela: ['Marce'], Mariana: ['Mari'], Carolina: ['Caro'], Natalia: ['Nati'], Soledad: ['Sole'], Claudia: ['Clau'],
};

/** Argentina «criolla»: apellidos de origen español y de los pueblos de la región. Un apellido (el del padre). */
export const ARGENTINA_CRIOLLA: Cultura = {
  id: 'argentina_criolla',
  peso: 3,
  nombres: NOMBRES_ARGENTINA,
  apodos: APODOS_ARGENTINA,
  apellidos: [...LATINOAMERICA.apellidos, 'Alvarado', 'Contreras', 'Villegas', 'Toledo', 'Rueda', 'Bravo', 'Soria', 'Páez', 'Ávila', 'Sarmiento'],
  numeroDeApellidos: 1,
};

/** Argentina de origen italiano (la mayor parte de la población desciende de italianos): nombres argentinos y apellidos italianos. */
export const ARGENTINA_ITALIANA: Cultura = {
  id: 'argentina_italiana',
  peso: 3,
  nombres: NOMBRES_ARGENTINA,
  apodos: APODOS_ARGENTINA,
  apellidos: lista('Rossi, Ferrari, Russo, Bianchi, Romano, Colombo, Ricci, Marino, Greco, Bruno, Gallo, Conti, De Luca, Costa, Giordano, Rizzo, Lombardi, Moretti, Barbieri, Fontana, Santoro, Mariani, Rinaldi, Caruso, Ferrara, Gatti, Pellegrini, Palumbo, Sanna, Farina, Martini, Leone, Longo, Gentile, Martinelli, Vitale, Serra, Coppola, De Santis, D\'Angelo, Marchetti, Parisi, Villa, Conte, Ferraro, Fabbri, Bianco, Testa, Morelli, Amato'),
  numeroDeApellidos: 1,
};
