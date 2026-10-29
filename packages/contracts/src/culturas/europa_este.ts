import { lista, type Cultura } from './tipos';

/** Rumanía y Moldavia (la comunidad más numerosa de Europa del este en España): un apellido, sin cambio por sexo. */
export const RUMANIA: Cultura = {
  id: 'rumania',
  peso: 5,
  nombres: {
    f: {
      jovenes: lista('Maria, Ana, Elena, Andreea, Alexandra, Ioana, Daniela, Sofia, Teodora, Antonia, Sara, Bianca, Denisa, Alina, Diana, Gabriela, Larisa, Karina, Natalia, Rebeca, Eva, Daria, Miruna, Luisa, Raluca'),
      adultos: lista('Maria, Elena, Ana, Cristina, Mihaela, Daniela, Georgiana, Alina, Diana, Gabriela, Larisa, Roxana, Simona, Raluca, Monica, Camelia, Carmen, Ionela, Florentina, Lacramioara, Liliana, Nicoleta, Oana, Ramona, Valentina'),
    },
    m: {
      jovenes: lista('David, Andrei, Alexandru, Mihai, Gabriel, Daniel, Darius, Rareș, Luca, Matei, Ionuț, Cristian, Denis, Stefan, Adrian, Bogdan, Marian, Florin, Nicolae, Vlad, Robert, Eduard'),
      adultos: lista('Marian, Florin, Gabriel, Daniel, Răzvan, Adrian, Bogdan, Cătălin, Dorin, Marius, Ovidiu, Vasile, Sorin, Viorel, Ionuț, Cristian, Mihai, Andrei, Alexandru, Constantin, Nicolae, Ion, Gheorghe, Costel, Lucian'),
    },
  },
  apodos: { Alexandru: ['Alex', 'Sandu'], Cristian: ['Cristi'], Gabriel: ['Gabi'], Constantin: ['Costi'], Florin: ['Flori'], Mihai: ['Mihăiță'], Gheorghe: ['George'], Mihaela: ['Mihi'], Elena: ['Lenuța'], Andreea: ['Andra'], Georgiana: ['Gina'], Ionela: ['Ioni'] },
  apellidos: lista('Popescu, Ionescu, Popa, Stan, Dumitru, Marin, Constantin, Radu, Georgescu, Stoica, Munteanu, Rusu, Moldovan, Gheorghe, Ilie, Matei, Toma, Lungu, Ciobanu, Mocanu, Preda, Tudor, Dinu, Barbu, Nistor, Florea, Anghel, Cristea, Diaconu, Enache, Manole, Neagu, Oprea, Pavel, Rădulescu, Sandu, Șerban, Voicu, Zamfir'),
  numeroDeApellidos: 1,
};

/** Polonia y Ucrania/Rusia: un apellido; en las mujeres cambia la terminación (Kowalski → Kowalska). */
export const POLONIA_Y_ESLAVOS: Cultura = {
  id: 'eslavos',
  peso: 3,
  nombres: {
    f: {
      jovenes: lista('Anna, Maria, Zofia, Julia, Maja, Natalia, Oliwia, Alicja, Amelia, Hanna, Sofia, Veronika, Polina, Anastasia, Daria, Viktoria, Yana, Alisa, Kateryna, Sofiya, Mariya, Eva, Nika, Tetiana'),
      adultos: lista('Katarzyna, Agnieszka, Magdalena, Anna, Ewa, Małgorzata, Joanna, Barbara, Beata, Natalia, Olga, Oksana, Iryna, Svitlana, Tetiana, Yulia, Irina, Ekaterina, Marina, Tatiana, Lyudmila, Nadia, Galina, Valentina, Zhanna, Larysa'),
    },
    m: {
      jovenes: lista('Jakub, Antoni, Jan, Szymon, Franciszek, Filip, Mikołaj, Aleksander, Michał, Maksym, Artem, Dmytro, Danylo, Nazar, Mykola, Ivan, Daniil, Egor, Kirill, Matvey, Vladyslav, Bohdan, Yaroslav'),
      adultos: lista('Piotr, Krzysztof, Tomasz, Marcin, Paweł, Michał, Andrzej, Jan, Stanisław, Oleksandr, Andriy, Dmytro, Serhiy, Volodymyr, Ivan, Sergey, Alexey, Dmitry, Igor, Yuri, Vasyl, Taras, Oleh, Mykola, Anatoliy, Viktor'),
    },
  },
  apodos: { Oleksandr: ['Sasha'], Alexey: ['Alyosha', 'Alex'], Dmitry: ['Dima'], Vladimir: ['Vova'], Ekaterina: ['Katya'], Yulia: ['Yulya'], Natalia: ['Natasha'], Anastasia: ['Nastya'], Elena: ['Lena'], Katarzyna: ['Kasia'], Małgorzata: ['Gosia'], Agnieszka: ['Aga'], Krzysztof: ['Krzys'], Tomasz: ['Tomek'], Michał: ['Michu'], Piotr: ['Piotrek'], Jakub: ['Kuba'], Mykola: ['Kolya'], Sergey: ['Seryozha'], Ivan: ['Vanya'], Tetiana: ['Tanya'], Svitlana: ['Sveta'], Oksana: ['Oksi'], Irina: ['Ira'] },
  apellidos: lista('Kowalski, Nowak, Wiśniewski, Wójcik, Kowalczyk, Kamiński, Lewandowski, Zieliński, Szymański, Woźniak, Dąbrowski, Kozłowski, Jankowski, Mazur, Wojciechowski, Kwiatkowski, Krawczyk, Piotrowski, Grabowski, Pawlak, Michalski, Zając, Król, Wieczorek, Ivanov, Petrov, Kovalenko, Shevchenko, Bondarenko, Tkachenko, Melnyk, Kravchenko, Boyko, Kovalchuk, Sidorov, Smirnov, Popov, Sokolov, Volkov, Morozov, Novikov, Fedorov, Lebedev, Orlov'),
  numeroDeApellidos: 1,
  femenino: [['ski', 'ska'], ['cki', 'cka'], ['dzki', 'dzka'], ['ov', 'ova'], ['ev', 'eva'], ['in', 'ina']],
};

/** Bulgaria y los Balcanes: un apellido, también con forma femenina. */
export const BULGARIA_Y_BALCANES: Cultura = {
  id: 'balcanes',
  peso: 2,
  nombres: {
    f: {
      jovenes: lista('Maria, Sofia, Viktoria, Ivana, Nikol, Gabriela, Simona, Elena, Dimitrina, Teodora, Mila, Petra, Katya, Lora, Elitsa, Denitsa, Ana, Marija, Jovana, Milica'),
      adultos: lista('Maria, Ivanka, Stanimira, Dimitrina, Mariya, Stoyanka, Nikolina, Petya, Elena, Tsvetanka, Radka, Vesela, Yordanka, Gergana, Mariana, Silvia, Rositsa, Daniela, Milena, Snezhana'),
    },
    m: {
      jovenes: lista('Georgi, Nikolay, Dimitar, Ivan, Aleksandar, Martin, Stefan, Daniel, Viktor, Boris, Kaloyan, Nikola, Marko, Luka, Stefan, Filip, Petar, Lazar'),
      adultos: lista('Georgi, Nikolay, Dimitar, Ivan, Petar, Stefan, Plamen, Krasimir, Todor, Hristo, Kiril, Svetoslav, Stoyan, Yordan, Zlatko, Angel, Atanas, Boyan, Marin, Rumen'),
    },
  },
  apellidos: lista('Georgiev, Dimitrov, Nikolov, Todorov, Stoyanov, Ivanov, Petrov, Hristov, Angelov, Kolev, Marinov, Yordanov, Atanasov, Iliev, Popov, Vasilev, Kostov, Stefanov, Gospodinov, Zlatev, Horvat, Kovač, Babić, Marković, Jovanović, Nikolić, Petrović'),
  numeroDeApellidos: 1,
  femenino: [['ov', 'ova'], ['ev', 'eva']],
};
