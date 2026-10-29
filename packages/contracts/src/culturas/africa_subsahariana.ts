import { lista, type Cultura } from './tipos';

/** África occidental francófona (Senegal, Malí, Guinea): un apellido. */
export const OESTE_AFRICANO: Cultura = {
  id: 'africa_occidental',
  peso: 2,
  nombres: {
    f: {
      jovenes: lista('Aminata, Fatoumata, Awa, Mariama, Aissatou, Rokia, Binta, Mame, Ndeye, Adama, Khady, Coumba, Fanta, Kadiatou, Oumou, Safiatou, Salimata, Sokhna, Ramata, Hawa'),
      adultos: lista('Aminata, Fatoumata, Awa, Mariama, Aissatou, Khady, Rokia, Binta, Fanta, Kadiatou, Oumou, Safiatou, Salimata, Ramata, Hawa, Mame, Ndeye, Coumba, Adama, Ndèye'),
    },
    m: {
      jovenes: lista('Mamadou, Moussa, Ibrahima, Cheikh, Ousmane, Abdou, Seydou, Modou, Lamine, Omar, Ismaila, Boubacar, Samba, Daouda, Alpha, Mamoudou, Souleymane, Bakary, Idrissa, Pape'),
      adultos: lista('Mamadou, Moussa, Ibrahima, Cheikh, Ousmane, Abdou, Seydou, Modou, Lamine, Ismaila, Boubacar, Samba, Daouda, Alpha, Souleymane, Bakary, Idrissa, Pape, Oumar, Amadou'),
    },
  },
  apellidos: lista('Diop, Ndiaye, Fall, Sow, Ba, Diallo, Sy, Gueye, Mbaye, Sarr, Cissé, Camara, Traoré, Keita, Konaté, Coulibaly, Touré, Sanogo, Sissoko, Barry, Bah, Faye, Thiam, Seck, Niang, Kane, Samb, Dieng, Diagne, Mendy, Sane, Sylla, Doumbia, Diakité'),
  numeroDeApellidos: 1,
};

/** Nigeria, Ghana y Guinea Ecuatorial / África central: un apellido. */
export const AFRICA_CENTRAL_Y_GOLFO: Cultura = {
  id: 'africa_golfo',
  peso: 1,
  nombres: {
    f: {
      jovenes: lista('Esther, Grace, Blessing, Joy, Mercy, Patience, Chiamaka, Ngozi, Amara, Folake, Sade, Abena, Akosua, Ama, Efua, Naomi, Ruth, Sarah, Marie, Mireille, Chantal, Solange, Faith, Precious, Gloria, Ángela, Carolina, Elena, Rosa, Cristina'),
      adultos: lista('Esther, Grace, Mercy, Patience, Ngozi, Folake, Sade, Abena, Akosua, Ama, Efua, Naomi, Ruth, Sarah, Marie, Mireille, Chantal, Solange, Faith, Rosa, Carmen, Ángela, Teresa, Josefa, Elena, Isabel'),
    },
    m: {
      jovenes: lista('Emmanuel, Samuel, Daniel, Michael, David, Joseph, Kwame, Kofi, Kwesi, Yaw, Chidi, Emeka, Obinna, Tunde, Segun, Femi, Jean, Pierre, Patrick, Christian, Serge, Junior, Prince, Praise, Carlos, Miguel, Pablo, Santiago'),
      adultos: lista('Emmanuel, Samuel, Daniel, Michael, David, Joseph, Kwame, Kofi, Kwesi, Yaw, Chidi, Emeka, Obinna, Tunde, Segun, Femi, Jean, Pierre, Patrick, Christian, Serge, Teodoro, Santiago, Miguel, Pablo, Antonio, Francisco'),
    },
  },
  apellidos: lista('Okafor, Adeyemi, Okonkwo, Eze, Nwosu, Mensah, Owusu, Boateng, Asante, Agyeman, Ndong, Obiang, Nguema, Mba, Ondo, Esono, Bokesa, Mbomio, Ela, Mangue, Abaga, Nsue, Eyang, Ebang, Balogun, Ogunleye, Adebayo, Osei, Appiah, Danso, Nkomo, Mbeki, Kabila, Tshisekedi, Mukendi, Kalala'),
  numeroDeApellidos: 1,
};
