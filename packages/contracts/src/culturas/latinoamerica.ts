import { lista, type Cultura } from './tipos';

/** Latinoamérica hispanohablante (rioplatense, mexicana, andina, caribeña…): nombres y apellidos habituales. */
export const LATINOAMERICA: Cultura = {
  id: 'latinoamerica',
  peso: 1,
  nombres: {
    f: {
      jovenes: lista('Valentina, Camila, Isabella, Sofía, Mía, Valeria, Martina, Luciana, Emma, Catalina, Agustina, Renata, Julieta, Antonella, Florencia, Guadalupe, Ximena, Daniela, Fernanda, Mariana, Paola, Gabriela, Andrea, Victoria, Emilia, Delfina, Josefina, Candela, Milagros, Abigail, Regina, Romina, Salomé, Samantha, Sara, Zoe, Lucía, Amanda, Ariana, Bianca, Brenda, Carolina, Constanza, Dulce, Elena, Jazmín, Lola, Malena, Micaela, Nicole, Rocío, Sol'),
      adultos: lista('María, Ana, Carmen, Rosa, Laura, Patricia, Claudia, Verónica, Mónica, Liliana, Marcela, Silvana, Romina, Lorena, Alejandra, Gabriela, Andrea, Natalia, Carolina, Paola, Sandra, Susana, Norma, Graciela, Beatriz, Elena, Isabel, Lucía, Adriana, Cecilia, Cristina, Daniela, Diana, Elizabeth, Fernanda, Gladys, Guadalupe, Julia, Karina, Leticia, Luisa, Margarita, Mariela, Marta, Miriam, Nancy, Noelia, Paula, Rocío, Sonia, Teresa, Viviana'),
    },
    m: {
      jovenes: lista('Santiago, Mateo, Matías, Sebastián, Benjamín, Thiago, Joaquín, Lautaro, Facundo, Nicolás, Emiliano, Tomás, Agustín, Bautista, Gael, Juan Diego, Samuel, Leonardo, Daniel, Alejandro, Diego, Lucas, Martín, Máximo, Felipe, Ian, Valentín, Ignacio, Bruno, Dylan, Franco, Gonzalo, Iker, Maximiliano, Rodrigo, Axel, Ezequiel, Federico, Gabriel, Santino, Simón, Julián'),
      adultos: lista('Juan, Luis, Carlos, Jorge, Miguel, Fernando, Ricardo, Alejandro, Javier, Pablo, Andrés, Gustavo, Marcelo, Héctor, Hugo, Raúl, Ramón, Rodrigo, Ezequiel, Maximiliano, Federico, Gonzalo, Cristian, José, Manuel, Roberto, Eduardo, Sergio, Daniel, Diego, Mario, Oscar, Víctor, Walter, Claudio, Néstor, Gabriel, Julio, Rubén, Osvaldo, Alberto, Antonio, Enrique, Francisco, Guillermo, Hernán, Leandro, Martín, Pedro, Sebastián, Tomás'),
    },
  },
  compuestos: {
    f: lista('María José, María Fernanda, Ana María, María Elena, María Eugenia, María Laura, María Belén, María Cecilia, María Alejandra, María Luisa, Ana Laura, María Victoria'),
    m: lista('José Luis, Juan Carlos, Juan Manuel, Luis Miguel, Juan Pablo, José Antonio, Miguel Ángel, José Manuel, Carlos Alberto, Juan José, José Miguel, Luis Fernando'),
  },
  probabilidadDeCompuesto: { adultos: 0.12, jovenes: 0.03 },
  apodos: { Francisco: ['Pancho', 'Paco', 'Panchito'], José: ['Pepe', 'Cheo'], Juan: ['Juancho', 'Juanito'], Alejandro: ['Ale', 'Alejo'], Guadalupe: ['Lupe', 'Lupita'], María: ['Mari', 'Marita'], Ricardo: ['Richi', 'Ricky'], Fernando: ['Fer', 'Nando'], Eduardo: ['Lalo', 'Edu'], Ernesto: ['Neto'], Roberto: ['Beto', 'Rober'], Guillermo: ['Memo', 'Guille'], Rodrigo: ['Rodri'], Maximiliano: ['Maxi'], Sebastián: ['Seba'], Nicolás: ['Nico'], Santiago: ['Santi'], Federico: ['Fede'], Agustín: ['Agus'], Ezequiel: ['Eze'], Facundo: ['Facu'], Valentina: ['Vale', 'Valen'], Florencia: ['Flor', 'Flopy'], Agustina: ['Agus'], Constanza: ['Coni'], Fernanda: ['Fer', 'Nanda'], Gabriela: ['Gaby'], Mariana: ['Mari'], Carolina: ['Caro'], Natalia: ['Nati'], Alejandra: ['Ale', 'Alejandrita'], Victoria: ['Vicky'], Antonella: ['Anto'], Milagros: ['Mili'] },
  apellidos: lista('González, Rodríguez, Gómez, Fernández, López, Díaz, Martínez, Pérez, Romero, Sánchez, García, Sosa, Torres, Ramírez, Flores, Acosta, Benítez, Medina, Herrera, Suárez, Aguirre, Giménez, Gutiérrez, Peralta, Rojas, Ortiz, Silva, Núñez, Luna, Juárez, Cabrera, Ríos, Morales, Domínguez, Castro, Vargas, Ruiz, Álvarez, Molina, Delgado, Ramos, Mendoza, Vera, Ibarra, Quiroga, Villalba, Maldonado, Cardozo, Figueroa, Paz, Ledesma, Arias, Cáceres, Escobar, Funes, Godoy, Gallardo, Barrios, Bustos, Campos, Carrizo, Coronel, Correa, Duarte, Esquivel, Franco, Guzmán, Heredia, Ibáñez, Lucero, Méndez, Moreno, Muñoz, Navarro, Olivera, Ojeda, Pereyra, Pineda, Reyes, Salazar, Sandoval, Valenzuela, Vázquez, Zárate, Zúñiga, Rivero, Montenegro, Palacios, Chávez, Cruz, Castillo, Ponce, Velázquez, Hernández'),
  numeroDeApellidos: 2,
};
