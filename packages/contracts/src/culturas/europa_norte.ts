import { lista, type Cultura } from './tipos';

/** Reino Unido e Irlanda: un apellido. */
export const BRITANICA: Cultura = {
  id: 'britanica',
  peso: 3,
  nombres: {
    f: {
      jovenes: lista('Olivia, Amelia, Isla, Ava, Emily, Sophie, Grace, Lily, Mia, Ella, Charlotte, Chloe, Freya, Poppy, Evie, Ruby, Isabelle, Hannah, Jessica, Lucy, Emma, Ivy, Sienna, Harper'),
      adultos: lista('Sarah, Emma, Laura, Rebecca, Jessica, Claire, Rachel, Helen, Karen, Susan, Jane, Julie, Michelle, Amanda, Joanne, Lisa, Louise, Nicola, Katie, Victoria, Sophie, Hannah, Charlotte, Lucy, Elizabeth, Margaret'),
    },
    m: {
      jovenes: lista('Oliver, Jack, Harry, George, Noah, Leo, Oscar, Charlie, Jacob, Freddie, Alfie, Archie, Theo, Thomas, Henry, Arthur, Joshua, Ethan, Lucas, William, James, Jacob, Max'),
      adultos: lista('James, John, David, Michael, Paul, Mark, Andrew, Peter, Stephen, Richard, Simon, Daniel, Christopher, Matthew, Robert, Thomas, Martin, Ian, Gary, Steven, Adam, Ben, Tom, Jonathan, Alan, Keith'),
    },
  },
  apellidos: lista('Smith, Jones, Taylor, Brown, Williams, Wilson, Johnson, Davies, Evans, Thomas, Roberts, Walker, Wright, Robinson, Thompson, White, Hughes, Edwards, Green, Hall, Wood, Harris, Lewis, Martin, Jackson, Clarke, Turner, Hill, Scott, Cooper, Morris, Ward, Moore, King, Watson, Baker, Harrison, Morgan, Patel, Young, Allen, Mitchell, James, Anderson, Phillips, Lee, Bell, Parker, Murphy, Kelly, O\'Brien, Ryan, Walsh'),
  numeroDeApellidos: 1,
};

/** Alemania, Francia, Italia y los países nórdicos y bajos: un apellido. */
export const CONTINENTAL: Cultura = {
  id: 'continental',
  peso: 4,
  nombres: {
    f: {
      jovenes: lista('Emma, Sophie, Marie, Lena, Mia, Hannah, Anna, Lea, Léa, Manon, Camille, Chloé, Louise, Jade, Giulia, Sofia, Aurora, Alice, Ginevra, Greta, Maja, Ida, Freja, Ella, Julia, Laura, Clara, Charlotte, Lotte, Saskia'),
      adultos: lista('Anna, Maria, Petra, Katrin, Ulrike, Heidi, Sabine, Claudia, Monika, Andrea, Nathalie, Sylvie, Isabelle, Catherine, Valérie, Sandrine, Claire, Francesca, Chiara, Elisa, Paola, Giovanna, Ingrid, Astrid, Karin, Eva, Helena, Marianne, Annika, Sofie'),
    },
    m: {
      jovenes: lista('Luca, Leon, Paul, Felix, Jonas, Elias, Noah, Louis, Hugo, Gabriel, Arthur, Jules, Lucas, Matteo, Leonardo, Alessandro, Tommaso, Lorenzo, Oskar, Erik, Liam, William, Max, Finn, Tom, Milan'),
      adultos: lista('Hans, Klaus, Wolfgang, Jürgen, Markus, Stefan, Peter, Thomas, Michael, Pierre, Jean, Philippe, Laurent, Nicolas, Olivier, Marco, Giovanni, Andrea, Luca, Alessandro, Paolo, Lars, Anders, Henrik, Johan, Mats, Nils, Jan, Pieter, Dirk'),
    },
  },
  apellidos: lista('Müller, Schmidt, Schneider, Fischer, Weber, Meyer, Wagner, Becker, Hoffmann, Schulz, Bauer, Koch, Richter, Klein, Wolf, Dubois, Martin, Bernard, Moreau, Laurent, Simon, Michel, Lefèbvre, Leroy, Rossi, Russo, Ferrari, Esposito, Bianchi, Romano, Colombo, Ricci, Marino, Greco, Andersson, Johansson, Karlsson, Nilsson, Eriksson, Larsson, Olsson, Hansen, Jensen, Nielsen, Pedersen, de Vries, Jansen, Peeters'),
  numeroDeApellidos: 1,
};
